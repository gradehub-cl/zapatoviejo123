package cl.gradehub.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "GradeHubCanvas")
public final class GradeHubCanvas extends Plugin {
    private static final List<CanvasPolitica.Parametro> SIN_PARAMETROS = Collections.emptyList();
    private static final CanvasPolitica.Parametro PAGINA = new CanvasPolitica.Parametro("per_page", "100");
    private static final CanvasHttp HTTP = new CanvasHttp();
    private static final ExecutorService RED = Executors.newFixedThreadPool(4);
    private static CanvasTokens deposito;
    private CanvasTokens tokens;

    @Override
    public void load() {
        synchronized (GradeHubCanvas.class) {
            if (deposito == null) deposito = new CanvasTokens(getContext().getApplicationContext());
            tokens = deposito;
        }
    }

    private String cuenta(PluginCall call) {
        String cuenta = call.getString("cuenta");
        if (CanvasPolitica.cuentaValida(cuenta)) return cuenta.toLowerCase(Locale.ROOT);
        call.reject("Inicia sesión en GradeHub.");
        return null;
    }

    @PluginMethod
    public void estado(PluginCall call) {
        String cuenta = cuenta(call);
        if (cuenta == null) return;
        try {
            call.resolve(new JSObject().put("conectado", tokens.leer(cuenta) != null));
        } catch (Exception e) {
            call.reject("No pudimos revisar la conexión de Canvas en este teléfono.");
        }
    }

    @PluginMethod
    public void conectar(PluginCall call) {
        String cuenta = cuenta(call);
        if (cuenta == null) return;
        String token = call.getString("token", "").trim();
        call.getData().remove("token");
        if (!CanvasPolitica.tokenValido(token)) {
            call.reject("Eso no parece un token de Canvas.");
            return;
        }
        UUID intento = tokens.iniciar(cuenta);
        RED.execute(() -> {
            try {
                HTTP.pedir("users/self", SIN_PARAMETROS, token, false);
                if (tokens.terminar(cuenta, intento, token)) call.resolve(new JSObject().put("conectado", true));
                else call.reject("La conexión se canceló.");
            } catch (CanvasHttp.Fallo e) {
                try {
                    if (tokens.terminar(cuenta, intento, null)) call.reject(e.mensaje(), String.valueOf(e.codigo));
                    else call.reject("La conexión se canceló.");
                } catch (Exception ignorado) {
                    call.reject("La conexión se canceló.");
                }
            } catch (Exception e) {
                call.reject("No pudimos guardar el token en este teléfono.");
            }
        });
    }

    @PluginMethod
    public void desconectar(PluginCall call) {
        String cuenta = cuenta(call);
        if (cuenta == null) return;
        try {
            if (tokens.desconectar(cuenta)) {
                call.resolve(new JSObject().put("conectado", false));
                return;
            }
        } catch (Exception ignorado) {
            // Los errores de Android Keystore se traducen sin adjuntar su detalle.
        }
        call.reject("No pudimos desconectar Canvas en este teléfono.");
    }

    @PluginMethod
    public void get(PluginCall call) {
        String cuenta = cuenta(call);
        if (cuenta == null) return;
        String ruta = call.getString("path", "");
        List<CanvasPolitica.Parametro> items = parametros(call.getObject("params"));
        if (!CanvasPolitica.parametrosValidos(ruta, items)) {
            call.reject("Esa consulta a Canvas no está permitida.");
            return;
        }
        consultar(call, cuenta, lectura -> {
            try {
                return proyectar(ruta, HTTP.pedir(ruta, items, lectura.token, false), lectura.token);
            } catch (CanvasHttp.Fallo error) {
                // Un curso puede devolver 401 con un token todavía válido.
                if (error.codigo == 401 && tokens.vigente(cuenta, lectura)) {
                    try {
                        HTTP.pedir("users/self", SIN_PARAMETROS, lectura.token, false);
                    } catch (CanvasHttp.Fallo comprobacion) {
                        if (comprobacion.codigo == 401) tokens.revocar(cuenta, lectura);
                    }
                }
                throw error;
            }
        });
    }

    private JSObject proyectar(String ruta, Object datos, String token) throws CanvasHttp.Fallo {
        switch (CanvasPolitica.tipo(ruta)) {
            case CURSOS: return respuesta(CanvasPolitica.proyectarCursos(datos));
            case GRUPOS: return respuesta(CanvasPolitica.proyectarGrupos(datos));
            case EVENTOS: return respuesta(CanvasPolitica.proyectarEventos(datos));
            case PROGRAMA: return respuesta(CanvasPolitica.proyectarPrograma(datos));
            case ANUNCIOS: return respuesta(CanvasPolitica.proyectarAnuncios(datos));
            case TAREAS:
                String gruposRuta = ruta.replace("/assignments", "/assignment_groups");
                Object grupos;
                try {
                    grupos = HTTP.pedir(gruposRuta, Collections.singletonList(PAGINA), token, false);
                } catch (CanvasHttp.Fallo error) {
                    if (error.codigo == 401) throw error;
                    grupos = new JSONArray();
                }
                return respuesta(CanvasPolitica.agregarGrupos(datos, grupos)).put("grupos", CanvasPolitica.proyectarGrupos(grupos));
            default: return respuesta(new JSONArray());
        }
    }

    @PluginMethod
    public void archivosCurso(PluginCall call) {
        String cuenta = cuenta(call);
        if (cuenta == null) return;
        long curso = id(call, "curso");
        if (!CanvasPolitica.idValido(curso)) {
            call.reject("Ese curso no es válido.");
            return;
        }
        consultar(call, cuenta, lectura -> {
            String ruta = "courses/" + curso;
            Object archivos = null;
            try {
                archivos = HTTP.pedir(ruta + "/files", Collections.singletonList(PAGINA), lectura.token, true);
            } catch (CanvasHttp.Fallo ignorado) {
                // Todavía puede leer los módulos si el curso esconde sus archivos.
            }
            List<CanvasPolitica.Parametro> parametros = new ArrayList<>();
            parametros.add(new CanvasPolitica.Parametro("include[]", "items"));
            parametros.add(PAGINA);
            Object modulos = null;
            try {
                modulos = HTTP.pedir(ruta + "/modules", parametros, lectura.token, true);
            } catch (CanvasHttp.Fallo error) {
                if (archivos == null) throw new ErrorLectura("No pudimos ver los archivos del curso en Canvas.", error.codigo);
            }
            return respuesta(CanvasPolitica.proyectarArchivos(archivos, modulos));
        });
    }

    @PluginMethod
    public void leerArchivo(PluginCall call) {
        String cuenta = cuenta(call);
        if (cuenta == null) return;
        long curso = id(call, "curso");
        long archivo = id(call, "archivo");
        if (!CanvasPolitica.idValido(curso) || !CanvasPolitica.idValido(archivo)) {
            call.reject("Ese archivo no es válido.");
            return;
        }
        consultar(call, cuenta, lectura -> {
            JSONObject ficha;
            try {
                ficha = CanvasPolitica.objeto(HTTP.pedir("courses/" + curso + "/files/" + archivo, SIN_PARAMETROS, lectura.token, true));
            } catch (CanvasHttp.Fallo error) {
                throw new ErrorLectura("No pudimos abrir ese archivo de Canvas.", error.codigo);
            }
            String nombre = CanvasPolitica.cadena(ficha, "display_name");
            String tipo = CanvasPolitica.tipoArchivo(nombre, CanvasPolitica.cadena(ficha, "content-type"));
            if (tipo == null) throw new ErrorLectura("Ese archivo no es PDF, Word ni texto.");
            Object tamano = ficha.opt("size");
            if (CanvasPolitica.entero(tamano) && ((Number) tamano).longValue() > CanvasPolitica.BYTES_ARCHIVO) {
                throw new ErrorLectura("El archivo es demasiado grande.");
            }
            URI url;
            try {
                url = URI.create(CanvasPolitica.cadena(ficha, "url"));
                if (!CanvasPolitica.descargaValida(url)) throw new IllegalArgumentException();
            } catch (IllegalArgumentException error) {
                throw new ErrorLectura("Canvas no entregó el archivo.");
            }
            byte[] datos;
            try {
                datos = HTTP.descargar(url, lectura.token);
            } catch (IOException | IllegalArgumentException error) {
                throw new ErrorLectura("No pudimos descargar el archivo de Canvas.");
            }
            String texto = CanvasDocumentos.texto(getContext(), datos, tipo);
            return JSObject.fromJSONObject(CanvasPolitica.recortarTexto(texto))
                .put("nombre", CanvasPolitica.prefijo(nombre, 200)).put("tipo", tipo);
        });
    }

    private interface Consulta { JSObject leer(CanvasTokens.Lectura lectura) throws Exception; }

    private void consultar(PluginCall call, String cuenta, Consulta consulta) {
        final CanvasTokens.Lectura lectura;
        try {
            lectura = tokens.leer(cuenta);
        } catch (Exception error) {
            call.reject("No pudimos leer la conexión de Canvas en este teléfono.");
            return;
        }
        if (lectura == null) {
            call.reject("Conecta Canvas primero.", "401");
            return;
        }
        RED.execute(() -> {
            try {
                if (!tokens.vigente(cuenta, lectura)) throw new ErrorLectura("La conexión se canceló.");
                JSObject respuesta = consulta.leer(lectura);
                if (tokens.vigente(cuenta, lectura)) call.resolve(respuesta);
                else call.reject("La conexión se canceló.");
            } catch (CanvasHttp.Fallo error) {
                call.reject(error.mensaje(), String.valueOf(error.codigo));
            } catch (ErrorLectura error) {
                if (error.codigo == null) call.reject(error.getMessage());
                else call.reject(error.getMessage(), error.codigo);
            } catch (Exception error) {
                call.reject("No pudimos leer la información de Canvas.");
            }
        });
    }

    private static final class ErrorLectura extends Exception {
        final String codigo;
        ErrorLectura(String mensaje) { super(mensaje); codigo = null; }
        ErrorLectura(String mensaje, int codigo) { super(mensaje); this.codigo = String.valueOf(codigo); }
    }

    private static long id(PluginCall call, String campo) {
        Object valor = call.getData().opt(campo);
        return CanvasPolitica.entero(valor) ? ((Number) valor).longValue() : 0;
    }

    private static List<CanvasPolitica.Parametro> parametros(JSONObject objeto) {
        List<CanvasPolitica.Parametro> items = new ArrayList<>();
        if (objeto == null) return items;
        for (Iterator<String> claves = objeto.keys(); claves.hasNext();) {
            String nombre = claves.next();
            Object valor = objeto.opt(nombre);
            if (valor instanceof JSONArray) {
                JSONArray lista = (JSONArray) valor;
                for (int i = 0; i < lista.length(); i++) items.add(new CanvasPolitica.Parametro(nombre, String.valueOf(lista.opt(i))));
            } else {
                items.add(new CanvasPolitica.Parametro(nombre, String.valueOf(valor)));
            }
        }
        return items;
    }

    private static JSObject respuesta(Object datos) { return new JSObject().put("data", datos); }
}
