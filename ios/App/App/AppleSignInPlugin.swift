import AuthenticationServices
import Capacitor

// Solo puente a la hoja del sistema. El nonce crudo y la sesión los lleva JS;
// no se guardan tokens, códigos de autorización ni nombres en UserDefaults/logs.
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]
    private var pendingCall: CAPPluginCall?
    private var controller: ASAuthorizationController?
    private var anchor: UIWindow?

    @objc func authorize(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pendingCall == nil else {
                call.reject("Hay un acceso de Apple en curso", "APPLE_EN_CURSO")
                return
            }
            guard let nonce = call.getString("nonce"),
                  nonce.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil else {
                call.reject("Nonce inválido", "APPLE_TOKEN_INVALIDO")
                return
            }
            guard let window = self.bridge?.viewController?.view.window else {
                call.reject("No pudimos abrir Apple", "APPLE_NO_DISPONIBLE")
                return
            }
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = nonce
            self.pendingCall = call
            self.anchor = window
            let controller = ASAuthorizationController(authorizationRequests: [request])
            self.controller = controller
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // La ventana se comprueba antes de presentar y se conserva hasta terminar.
        return anchor ?? ASPresentationAnchor()
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = pendingCall else { return }
        defer { finish() }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let data = credential.identityToken,
              let token = String(data: data, encoding: .utf8), !token.isEmpty else {
            call.reject("Apple no devolvió un token", "APPLE_TOKEN_INVALIDO")
            return
        }
        var result: [String: Any] = ["identityToken": token]
        if let components = credential.fullName {
            let name = PersonNameComponentsFormatter().string(from: components).trimmingCharacters(in: .whitespacesAndNewlines)
            if !name.isEmpty { result["fullName"] = name }
        }
        call.resolve(result)
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = pendingCall else { return }
        defer { finish() }
        let nsError = error as NSError
        if nsError.domain == ASAuthorizationError.errorDomain && nsError.code == ASAuthorizationError.canceled.rawValue {
            call.reject("Cancelado", "APPLE_CANCELADO")
        } else {
            // No trasladar detalles remotos, tokens ni identificadores al JS.
            call.reject("No pudimos iniciar sesión con Apple", "APPLE_NO_DISPONIBLE")
        }
    }

    private func finish() {
        pendingCall = nil
        controller = nil
        anchor = nil
    }
}
