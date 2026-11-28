package cl.gradehub.app;

import static org.junit.Assert.*;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Iterator;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class CanvasPoliticaTest {
    private interface Regla { boolean acepta(JSONObject caso) throws Exception; }

    private static void verificar(JSONObject conjunto, String clave, Regla regla) throws Exception {
        JSONArray casos = conjunto.getJSONArray(clave);
        assertTrue(clave, casos.length() > 0);
        for (int i = 0; i < casos.length(); i++) {
            JSONObject caso = casos.getJSONObject(i);
            assertEquals(caso.toString(), caso.getBoolean("acepta"), regla.acepta(caso));
        }
    }

    private JSONObject conjunto() throws Exception {
        try (InputStream entrada = getClass().getResourceAsStream("/canvas-politica-casos.json")) {
            assertNotNull(entrada);
            return new JSONObject(new String(CanvasHttp.bytes(entrada, 1_000_000), StandardCharsets.UTF_8));
        }
    }

    @Test public void rutasParametrosYPaginasCompartidas() throws Exception {
        JSONObject conjunto = conjunto();
        verificar(conjunto, "rutas", c -> CanvasPolitica.rutaValida(c.getString("ruta")));
        verificar(conjunto, "rutasArchivos", c -> CanvasPolitica.rutaArchivos(c.getString("ruta")));
        verificar(conjunto, "parametros", c -> {
            String ruta = c.getString("ruta");
            List<CanvasPolitica.Parametro> items = new ArrayList<>();
            JSONArray pares = c.getJSONArray("items");
            for (int i = 0; i < pares.length(); i++) {
                JSONArray p = pares.getJSONArray(i);
                items.add(new CanvasPolitica.Parametro(p.getString(0), p.getString(1)));
            }
            return c.optBoolean("archivos")
                ? CanvasPolitica.parametrosArchivos(ruta, items) : CanvasPolitica.parametrosValidos(ruta, items);
        });
        verificar(conjunto, "urls", c -> CanvasPolitica.urlValida(URI.create(c.getString("url")), c.getString("ruta"), false));
        verificar(conjunto, "paginasAnuncios", c -> CanvasPolitica.paginaAnunciosValida(URI.create(c.getString("url")), c.getString("ruta")));
        verificar(conjunto, "descargas", c -> CanvasPolitica.descargaValida(URI.create(c.getString("url"))));
        verificar(conjunto, "redirecciones", c -> CanvasPolitica.redireccionValida(URI.create(c.getString("url"))));
    }

    @Test public void proyeccionesCompartidas() throws Exception {
        JSONArray casos = conjunto().getJSONArray("proyecciones");
        for (int i = 0; i < casos.length(); i++) {
            JSONObject caso = casos.getJSONObject(i);
            String tipo = caso.getString("tipo");
            Object entrada = caso.get("entrada");
            Object salida;
            switch (tipo) {
                case "cursos": salida = CanvasPolitica.proyectarCursos(entrada); break;
                case "grupos": salida = CanvasPolitica.proyectarGrupos(entrada); break;
                case "eventos": salida = CanvasPolitica.proyectarEventos(entrada); break;
                case "anuncios": salida = CanvasPolitica.proyectarAnuncios(entrada); break;
                case "programa": salida = CanvasPolitica.proyectarPrograma(entrada); break;
                case "tareas": salida = CanvasPolitica.agregarGrupos(entrada, caso.get("grupos")); break;
                case "archivos": salida = CanvasPolitica.proyectarArchivos(entrada, caso.get("modulos")); break;
                default: throw new AssertionError(tipo);
            }
            Object esperado = caso.get("salida");
            assertTrue(tipo + ": " + salida + " ≠ " + esperado, iguales(esperado, salida));
        }
    }

    private boolean iguales(Object esperado, Object salida) throws Exception {
        if (esperado instanceof JSONObject && salida instanceof JSONObject) {
            JSONObject a = (JSONObject) esperado, b = (JSONObject) salida;
            if (a.length() != b.length()) return false;
            for (Iterator<String> it = a.keys(); it.hasNext();) {
                String k = it.next();
                if (!b.has(k) || !iguales(a.get(k), b.get(k))) return false;
            }
            return true;
        }
        if (esperado instanceof JSONArray && salida instanceof JSONArray) {
            JSONArray a = (JSONArray) esperado, b = (JSONArray) salida;
            if (a.length() != b.length()) return false;
            for (int i = 0; i < a.length(); i++) if (!iguales(a.get(i), b.get(i))) return false;
            return true;
        }
        if (esperado instanceof Number && salida instanceof Number) {
            return ((Number) esperado).doubleValue() == ((Number) salida).doubleValue();
        }
        return esperado.equals(salida);
    }

    @Test public void limitesYCuentas() throws Exception {
        assertEquals(3, CanvasPolitica.limitePaginas("courses/42/discussion_topics"));
        assertEquals(10, CanvasPolitica.limitePaginas("courses/42/assignments"));
        assertTrue(CanvasPolitica.idValido(999_999_999_999L));
        assertFalse(CanvasPolitica.idValido(1_000_000_000_000L));
        assertTrue(CanvasPolitica.cuentaValida("00000000-0000-0000-0000-000000000001"));
        assertFalse(CanvasPolitica.cuentaValida("1-1-1-1-1"));
        String sintetico = "0~" + "A".repeat(24);
        assertTrue(CanvasPolitica.tokenValido(sintetico));
        assertFalse(CanvasPolitica.tokenValido(sintetico + "\n"));
        assertEquals(4, CanvasHttp.bytes(new ByteArrayInputStream(new byte[4]), 4).length);
        assertThrows(IOException.class, () -> CanvasHttp.bytes(new ByteArrayInputStream(new byte[5]), 4));
        assertEquals("e\u0301", CanvasPolitica.prefijo("e\u0301ñ", 1));
        JSONObject programa = CanvasPolitica.proyectarPrograma(new JSONObject().put("syllabus_body", "a".repeat(60_001)));
        assertEquals(60_000, programa.getString("texto").length());
        assertTrue(programa.getBoolean("recortado"));
        JSONObject anuncio = new JSONObject().put("title", "a".repeat(300)).put("posted_at", "2026-11-08")
            .put("message", "Fecha confirmada. " + "x".repeat(10_000));
        JSONObject chico = CanvasPolitica.proyectarAnuncios(new JSONArray().put(anuncio)).getJSONObject(0);
        assertEquals(180, chico.getString("title").length());
        assertEquals("Fecha confirmada.", chico.getString("texto"));
    }

    @Test public void leeSoloElXmlDelDocumento() throws Exception {
        ByteArrayOutputStream datos = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(datos)) {
            zip.putNextEntry(new ZipEntry("word/metadata.xml"));
            zip.write("Contenido privado".getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
            zip.putNextEntry(new ZipEntry("word/document.xml"));
            zip.write("<w:document><w:p><w:r><w:t>Evaluación</w:t></w:r></w:p></w:document>".getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        assertEquals("Evaluación", CanvasDocumentos.textoDocx(datos.toByteArray()));
        assertEquals("", CanvasDocumentos.textoDocx(new byte[0]));
    }
}
