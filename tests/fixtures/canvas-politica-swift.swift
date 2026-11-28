import Foundation

// Se concatena con la prueba de ConexionesCanvas para ejecutar la política de
// producción con las mismas entradas sintéticas que el test JVM.
func comprobarCasosCompartidos(_ nombre: String) throws {
    let datos = try Data(contentsOf: URL(fileURLWithPath: nombre))
    guard let casos = try JSONSerialization.jsonObject(with: datos) as? [String: [[String: Any]]] else {
        fatalError("Casos compartidos inválidos")
    }
    func texto(_ fila: [String: Any], _ clave: String) -> String {
        fila[clave] as! String
    }
    func verificar(_ clave: String, _ prueba: ([String: Any]) -> Bool) {
        for caso in casos[clave]! {
            assert(prueba(caso) == (caso["acepta"] as! Bool), "\(clave): \(caso)")
        }
    }
    verificar("rutas") { CanvasPolitica.rutaValida(texto($0, "ruta")) }
    verificar("rutasArchivos") { CanvasPolitica.rutaArchivos(texto($0, "ruta")) }
    verificar("parametros") { caso in
        let ruta = texto(caso, "ruta")
        let items = (caso["items"] as! [[String]]).map { URLQueryItem(name: $0[0], value: $0[1]) }
        return caso["archivos"] as? Bool == true
            ? CanvasPolitica.parametrosArchivos(ruta, items)
            : CanvasPolitica.parametrosValidos(ruta, items)
    }
    verificar("urls") { CanvasPolitica.urlValida(URL(string: texto($0, "url"))!, ruta: texto($0, "ruta")) }
    verificar("paginasAnuncios") { CanvasPolitica.paginaAnunciosValida(URL(string: texto($0, "url"))!, ruta: texto($0, "ruta")) }
    verificar("descargas") { CanvasPolitica.descargaValida(URL(string: texto($0, "url"))!) }
    verificar("redirecciones") { CanvasPolitica.redireccionValida(URL(string: texto($0, "url"))!) }
    for caso in casos["proyecciones"]! {
        let tipo = texto(caso, "tipo")
        let entrada = caso["entrada"] as? [[String: Any]] ?? []
        let actual: Any
        switch tipo {
        case "cursos": actual = CanvasPolitica.proyectarCursos(entrada)
        case "grupos": actual = CanvasPolitica.proyectarGrupos(entrada)
        case "eventos": actual = CanvasPolitica.proyectarEventos(entrada)
        case "anuncios": actual = CanvasPolitica.proyectarAnuncios(entrada)
        case "tareas": actual = CanvasPolitica.agregarGrupos(entrada, grupos: caso["grupos"] as! [[String: Any]])
        case "programa": actual = CanvasPolitica.proyectarPrograma(caso["entrada"] as! [String: Any])
        case "archivos": actual = CanvasPolitica.proyectarArchivos(archivos: entrada, modulos: caso["modulos"] as! [[String: Any]])
        default: fatalError(tipo)
        }
        let resultado = try JSONSerialization.data(withJSONObject: actual, options: [.sortedKeys])
        let esperado = try JSONSerialization.data(withJSONObject: caso["salida"]!, options: [.sortedKeys])
        assert(resultado == esperado, "\(tipo) \(String(decoding: resultado, as: UTF8.self)) ≠ \(String(decoding: esperado, as: UTF8.self))")
    }
}

try comprobarCasosCompartidos(CommandLine.arguments[1])
