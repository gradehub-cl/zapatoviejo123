package cl.gradehub.app;

import java.net.URI;
import java.net.URLDecoder;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Contrato de CanvasPolitica.swift. Los casos JSON se ejecutan en ambas plataformas. */
final class CanvasPolitica {
    static final String HOST = "cursos.canvas.uc.cl";
    static final String API = "https://" + HOST + "/api/v1/";
    static final int BYTES = 2 * 1024 * 1024;
    static final int BYTES_ARCHIVO = 15 * 1024 * 1024;
    static final int TEXTO_MAX = 60_000;
    private static final String ID = "[0-9]{1,12}";
    private static final Pattern RUTA = Pattern.compile(
        "users/self|courses|calendar_events|courses/" + ID + "(?:/(?:assignments|assignment_groups|discussion_topics))?");
    private static final Pattern ARCHIVOS = Pattern.compile("courses/" + ID + "/(?:files|modules|files/" + ID + ")");
    private static final Pattern CUENTA = Pattern.compile("[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}");
    private static final Pattern TOKEN = Pattern.compile("[0-9]{1,8}~[A-Za-z0-9]{20,100}");
    private static final Pattern ENTIDAD = Pattern.compile("&(#(?:x[0-9a-fA-F]{1,6}|[0-9]{1,7})|[A-Za-z]{2,8});");
    private static final Map<String, String> ENTIDADES = entidades();

    enum Tipo { YO, CURSOS, TAREAS, GRUPOS, EVENTOS, PROGRAMA, ANUNCIOS }

    static final class Parametro {
        final String nombre;
        final String valor;

        Parametro(String nombre, String valor) {
            this.nombre = nombre;
            this.valor = valor;
        }
    }

    static boolean rutaValida(String ruta) { return RUTA.matcher(ruta).matches(); }
    static boolean rutaArchivos(String ruta) { return ARCHIVOS.matcher(ruta).matches(); }
    static boolean cuentaValida(String cuenta) { return cuenta != null && CUENTA.matcher(cuenta).matches(); }
    static boolean tokenValido(String token) { return token != null && TOKEN.matcher(token).matches(); }
    static boolean idValido(long id) { return id >= 1 && id <= 999_999_999_999L; }
    static boolean entero(Object valor) {
        return valor instanceof Number && ((Number) valor).doubleValue() == ((Number) valor).longValue();
    }

    static Tipo tipo(String ruta) {
        if (!rutaValida(ruta)) return null;
        switch (ruta) {
            case "users/self": return Tipo.YO;
            case "courses": return Tipo.CURSOS;
            case "calendar_events": return Tipo.EVENTOS;
            default:
                if (ruta.endsWith("/assignments")) return Tipo.TAREAS;
                if (ruta.endsWith("/assignment_groups")) return Tipo.GRUPOS;
                if (ruta.endsWith("/discussion_topics")) return Tipo.ANUNCIOS;
                return Tipo.PROGRAMA;
        }
    }

    static int limitePaginas(String ruta) { return tipo(ruta) == Tipo.ANUNCIOS ? 3 : 10; }

    private static boolean perPage(String valor) {
        return valor.matches("[0-9]{1,3}") && Integer.parseInt(valor) >= 1 && Integer.parseInt(valor) <= 100;
    }

    static boolean parametrosValidos(String ruta, List<Parametro> items) {
        Tipo tipo = tipo(ruta);
        if (tipo == null) return false;
        int contextos = 0;
        int anuncios = 0;
        for (Parametro p : items) {
            String v = p.valor;
            switch (p.nombre) {
                case "per_page": if (!perPage(v)) return false; break;
                case "enrollment_state": if (tipo != Tipo.CURSOS || !v.equals("active")) return false; break;
                case "include[]":
                    if (!(tipo == Tipo.CURSOS && v.equals("term")) &&
                        !(tipo == Tipo.TAREAS && v.equals("submission")) &&
                        !(tipo == Tipo.PROGRAMA && v.equals("syllabus_body"))) return false;
                    break;
                case "only_announcements":
                    if (tipo != Tipo.ANUNCIOS || !v.equals("true")) return false;
                    anuncios++;
                    break;
                case "bucket": if (tipo != Tipo.TAREAS || !v.matches("future|past|upcoming|undated")) return false; break;
                case "order_by": if (tipo != Tipo.TAREAS || !v.matches("due_at|position|name")) return false; break;
                case "context_codes[]":
                    if (tipo != Tipo.EVENTOS || !v.matches("course_" + ID)) return false;
                    contextos++;
                    break;
                case "type": if (tipo != Tipo.EVENTOS || !v.equals("event")) return false; break;
                case "start_date":
                case "end_date":
                    if (tipo != Tipo.EVENTOS || !v.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) return false;
                    break;
                default: return false;
            }
        }
        return (tipo != Tipo.EVENTOS || contextos >= 1 && contextos <= 10)
            && (tipo != Tipo.ANUNCIOS || anuncios == 1);
    }

    static boolean parametrosArchivos(String ruta, List<Parametro> items) {
        for (Parametro p : items) {
            if (p.nombre.equals("per_page") && perPage(p.valor)) continue;
            if (p.nombre.equals("include[]") && ruta.endsWith("/modules") && p.valor.equals("items")) continue;
            return false;
        }
        return true;
    }

    private static boolean httpsCanvas(URI url) {
        return "https".equals(url.getScheme()) && HOST.equals(url.getHost())
            && HOST.equals(url.getRawAuthority());
    }

    static boolean urlValida(URI url, String ruta, boolean archivos) {
        return httpsCanvas(url) && url.getRawFragment() == null
            && ("/api/v1/" + ruta).equals(url.getRawPath())
            && (archivos ? rutaArchivos(ruta) : rutaValida(ruta));
    }

    static boolean paginaAnunciosValida(URI url, String ruta) {
        if (tipo(ruta) != Tipo.ANUNCIOS) return true;
        List<Parametro> items = new ArrayList<>();
        boolean tienePagina = false;
        String query = url.getRawQuery();
        if (query == null) return false;
        for (String par : query.split("&", -1)) {
            String[] partes = par.split("=", 2);
            String nombre = decodificarQuery(partes[0]);
            String valor = partes.length == 2 ? decodificarQuery(partes[1]) : "";
            if ("page".equals(nombre)) {
                if (tienePagina || !paginaAnuncios(valor)) return false;
                tienePagina = true;
            } else {
                items.add(new Parametro(nombre, valor));
            }
        }
        return parametrosValidos(ruta, items);
    }

    private static boolean paginaAnuncios(String valor) {
        try {
            int pagina = Integer.parseInt(valor);
            return pagina >= 1 && pagina <= 3;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private static String decodificarQuery(String parte) {
        try {
            return URLDecoder.decode(parte.replace("+", "%2B"), "UTF-8");
        } catch (UnsupportedEncodingException e) {
            throw new AssertionError(e);
        }
    }

    static boolean descargaValida(URI url) {
        return httpsCanvas(url) && url.getRawPath().matches("(?:/courses/" + ID + ")?/files/" + ID + "/download");
    }

    static boolean redireccionValida(URI url) {
        if (!"https".equals(url.getScheme()) || url.getRawUserInfo() != null || url.getHost() == null) return false;
        String host = url.getHost().toLowerCase(Locale.ROOT);
        return host.equals(HOST) || host.matches("(?:.+\\.)?(?:inscloudgate\\.net|instructure\\.com|amazonaws\\.com)");
    }

    static JSONObject objeto(Object valor) { return valor instanceof JSONObject ? (JSONObject) valor : new JSONObject(); }
    static JSONArray lista(Object valor) { return valor instanceof JSONArray ? (JSONArray) valor : new JSONArray(); }

    static List<JSONObject> filas(Object valor) {
        JSONArray lista = lista(valor);
        List<JSONObject> filas = new ArrayList<>();
        for (int i = 0; i < lista.length(); i++) {
            JSONObject fila = lista.optJSONObject(i);
            if (fila == null) return new ArrayList<>();
            filas.add(fila);
        }
        return filas;
    }

    static void poner(JSONObject destino, String campo, Object valor) {
        try { destino.put(campo, valor); }
        catch (JSONException e) { throw new IllegalArgumentException("Valor JSON inválido."); }
    }

    private static JSONObject solo(JSONObject fila, String... campos) {
        JSONObject proyeccion = new JSONObject();
        for (String campo : campos) if (!fila.isNull(campo)) poner(proyeccion, campo, fila.opt(campo));
        return proyeccion;
    }

    static JSONArray proyectarCursos(Object entrada) {
        JSONArray salida = new JSONArray();
        for (JSONObject curso : filas(entrada)) {
            JSONObject fila = solo(curso, "id", "name", "course_code", "apply_assignment_group_weights");
            JSONObject term = curso.optJSONObject("term");
            if (term != null && term.opt("name") instanceof String) poner(fila, "term", solo(term, "name"));
            salida.put(fila);
        }
        return salida;
    }

    static JSONArray proyectarGrupos(Object entrada) {
        JSONArray salida = new JSONArray();
        for (JSONObject fila : filas(entrada)) salida.put(solo(fila, "id", "name", "group_weight"));
        return salida;
    }

    static JSONArray proyectarEventos(Object entrada) {
        JSONArray salida = new JSONArray();
        for (JSONObject evento : filas(entrada)) {
            Object tipo = evento.opt("type");
            if (tipo instanceof String && !tipo.equals("event")) continue;
            if (!cadena(evento, "context_code").startsWith("course_")) continue;
            salida.put(solo(evento, "id", "title", "start_at", "end_at", "all_day", "context_code"));
        }
        return salida;
    }

    static JSONArray proyectarAnuncios(Object entrada) {
        JSONArray salida = new JSONArray();
        for (JSONObject anuncio : filas(entrada)) {
            if (Boolean.FALSE.equals(anuncio.opt("published")) || Boolean.FALSE.equals(anuncio.opt("is_announcement"))) continue;
            String publicado = cadena(anuncio, "posted_at");
            if (publicado.isEmpty()) continue;
            String completo = textoPrograma(cadena(anuncio, "message"));
            String texto = prefijo(completo, 8_000);
            if (texto.length() < completo.length()) {
                int fin = Math.max(texto.lastIndexOf('\n'), Math.max(texto.lastIndexOf('.'), texto.lastIndexOf(';')));
                texto = texto.substring(0, fin + 1);
            }
            JSONObject fila = new JSONObject();
            poner(fila, "title", prefijo(textoPrograma(cadena(anuncio, "title")), 180));
            poner(fila, "posted_at", prefijo(publicado, 40));
            poner(fila, "texto", texto);
            salida.put(fila);
        }
        return salida;
    }

    static JSONObject proyectarPrograma(Object entrada) {
        String html = cadena(objeto(entrada), "syllabus_body");
        JSONObject salida = recortarTexto(textoPrograma(html));
        poner(salida, "archivo", Pattern.compile("/files/[0-9]+|instructure_file_link", Pattern.CASE_INSENSITIVE).matcher(html).find());
        return salida;
    }

    static JSONObject recortarTexto(String texto) {
        String corto = prefijo(texto, TEXTO_MAX);
        JSONObject salida = new JSONObject();
        poner(salida, "texto", corto);
        poner(salida, "recortado", corto.length() < texto.length());
        return salida;
    }

    private static final Pattern GRAFEMA = Pattern.compile("\\X");

    static String prefijo(String texto, int max) {
        if (texto.length() <= max) return texto;
        Matcher grafemas = GRAFEMA.matcher(texto);
        int fin = 0;
        for (int i = 0; i < max && grafemas.find(); i++) fin = grafemas.end();
        return texto.substring(0, fin);
    }

    static String cadena(JSONObject fila, String campo) {
        Object valor = fila.opt(campo);
        return valor instanceof String ? (String) valor : "";
    }

    static String textoPrograma(String html) {
        String s = html.replaceAll("(?s)<!--.*?-->", " ")
            .replaceAll("(?is)<(script|style|noscript|iframe|svg)\\b.*?</\\1\\s*>", " ")
            .replaceAll("(?i)<h[1-6]\\b[^>]*>", "\n# ")
            .replaceAll("(?i)</h[1-6]\\s*>", "\n")
            .replaceAll("(?i)</t[dh]\\s*>", "\t")
            .replaceAll("(?i)<br\\s*/?>", "\n")
            .replaceAll("(?i)<li\\b[^>]*>", "\n")
            .replaceAll("(?i)</(p|div|li|tr|ul|ol|table|blockquote|pre|section)\\s*>", "\n")
            .replaceAll("<[^>]*>", " ");
        Matcher entidades = ENTIDAD.matcher(s);
        StringBuffer texto = new StringBuffer();
        while (entidades.find()) {
            String entidad = entidades.group(1);
            String valor = ENTIDADES.get(entidad);
            if (entidad.startsWith("#")) {
                boolean hex = entidad.startsWith("#x");
                int numero = Integer.parseInt(entidad.substring(hex ? 2 : 1), hex ? 16 : 10);
                if (Character.isValidCodePoint(numero) && !(numero >= 0xd800 && numero <= 0xdfff)) {
                    valor = new String(Character.toChars(numero));
                }
            }
            entidades.appendReplacement(texto, Matcher.quoteReplacement(valor == null ? entidades.group() : valor));
        }
        entidades.appendTail(texto);
        return texto.toString().replace("\r", "")
            .replaceAll("[ \u00a0\u200b]+", " ")
            .replaceAll(" *\t *", "\t")
            .replaceAll("\t{2,}", "\t")
            .replaceAll("[ \t]+\n", "\n")
            .replaceAll("\n[ \t]+", "\n")
            .replaceAll("\n{3,}", "\n\n")
            .replaceAll("^[\\p{Z}\\s]+|[\\p{Z}\\s]+$", "");
    }

    private static Map<String, String> entidades() {
        Map<String, String> mapa = new LinkedHashMap<>();
        String[] nombres = ("nbsp amp quot apos lt gt ndash mdash aacute eacute iacute oacute uacute ntilde uuml "
            + "Aacute Eacute Iacute Oacute Uacute Ntilde ordm ordf").split(" ");
        String valores = " &\"'<>–—áéíóúñüÁÉÍÓÚÑºª";
        for (int i = 0; i < nombres.length; i++) mapa.put(nombres[i], valores.substring(i, i + 1));
        return mapa;
    }

    static JSONArray agregarGrupos(Object tareas, Object grupos) {
        Map<String, String> porId = new LinkedHashMap<>();
        for (JSONObject grupo : filas(grupos)) {
            if (!grupo.isNull("id") && grupo.opt("name") instanceof String) {
                porId.put(String.valueOf(grupo.opt("id")), cadena(grupo, "name"));
            }
        }
        JSONArray salida = new JSONArray();
        for (JSONObject tarea : filas(tareas)) {
            JSONObject fila = solo(tarea, "id", "name", "due_at", "assignment_group_id", "points_possible", "grading_type");
            String nombre = porId.get(String.valueOf(tarea.opt("assignment_group_id")));
            if (nombre != null) {
                JSONObject grupo = new JSONObject();
                poner(grupo, "name", nombre);
                poner(fila, "assignment_group", grupo);
            }
            JSONObject entrega = tarea.optJSONObject("submission");
            if (entrega != null) poner(fila, "submission", solo(entrega, "score", "grade", "excused", "workflow_state"));
            salida.put(fila);
        }
        return salida;
    }

    static String tipoArchivo(String nombre, String contentType) {
        String n = nombre.toLowerCase(Locale.ROOT);
        String tipo = contentType.toLowerCase(Locale.ROOT);
        if (tipo.equals("application/pdf") || n.endsWith(".pdf")) return "pdf";
        if (tipo.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document") || n.endsWith(".docx")) return "docx";
        if (tipo.equals("text/plain") || n.endsWith(".txt")) return "txt";
        return null;
    }

    static JSONArray proyectarArchivos(Object archivos, Object modulos) {
        Map<Long, JSONObject> porId = new LinkedHashMap<>();
        for (JSONObject archivo : filas(archivos)) {
            if (!(archivo.opt("display_name") instanceof String)) continue;
            String nombre = cadena(archivo, "display_name");
            String tipo = tipoArchivo(nombre, cadena(archivo, "content-type"));
            if (tipo != null) sumarArchivo(porId, archivo.opt("id"), nombre, tipo, archivo.opt("size"), null);
        }
        for (JSONObject modulo : filas(modulos)) {
            for (JSONObject item : filas(modulo.opt("items"))) {
                if (!"File".equals(item.opt("type")) || !(item.opt("title") instanceof String)) continue;
                String titulo = cadena(item, "title");
                String tipo = tipoArchivo(titulo, "");
                Object nombre = modulo.opt("name");
                sumarArchivo(porId, item.opt("content_id"), titulo, tipo != null ? tipo : "archivo", null,
                    nombre instanceof String ? (String) nombre : null);
            }
        }
        return new JSONArray(porId.values());
    }

    private static void sumarArchivo(Map<Long, JSONObject> porId, Object valorId, String nombre, String tipo, Object tamano, String modulo) {
        if (!entero(valorId) || porId.size() >= 300) return;
        long id = ((Number) valorId).longValue();
        if (!idValido(id)) return;
        JSONObject fila = porId.get(id);
        if (fila == null) {
            fila = new JSONObject();
            poner(fila, "id", id);
            poner(fila, "nombre", prefijo(nombre, 200));
            poner(fila, "tipo", tipo);
            porId.put(id, fila);
        }
        if (entero(tamano)) poner(fila, "tamano", tamano);
        if (modulo != null && fila.isNull("modulo")) poner(fila, "modulo", prefijo(modulo, 120));
    }
}
