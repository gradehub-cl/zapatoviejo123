package cl.gradehub.app;

import android.content.Context;
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader;
import com.tom_roush.pdfbox.io.MemoryUsageSetting;
import com.tom_roush.pdfbox.pdmodel.PDDocument;
import com.tom_roush.pdfbox.text.PDFTextStripper;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.Writer;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.StandardCharsets;
import java.util.zip.Inflater;
import java.util.zip.InflaterInputStream;

final class CanvasDocumentos {
    private static final int MAX_XML = 20 * 1024 * 1024;

    static String texto(Context contexto, byte[] archivo, String tipo) {
        try {
            switch (tipo) {
                case "pdf": return textoPdf(contexto, archivo);
                case "docx": return textoDocx(archivo);
                default: return new String(archivo, StandardCharsets.UTF_8);
            }
        } catch (IOException | RuntimeException e) {
            return "";
        }
    }

    private static String textoPdf(Context contexto, byte[] archivo) throws IOException {
        PDFBoxResourceLoader.init(contexto.getApplicationContext());
        try (PDDocument documento = PDDocument.load(new ByteArrayInputStream(archivo), MemoryUsageSetting.setupMainMemoryOnly(32L * 1024 * 1024))) {
            PDFTextStripper lector = new PDFTextStripper();
            lector.setEndPage(Math.min(60, documento.getNumberOfPages()));
            StringBuilder texto = new StringBuilder();
            // Conserva espacio para completar grafemas alrededor del límite,
            // y aborta temprano al recorrer un documento con demasiado texto.
            int max = 4 * CanvasPolitica.TEXTO_MAX;
            try {
                lector.writeText(documento, new Writer() {
                    @Override public void write(char[] chars, int inicio, int cantidad) throws IOException {
                        int quedan = max - texto.length();
                        texto.append(chars, inicio, Math.min(cantidad, quedan));
                        if (cantidad > quedan) throw new LimiteTexto();
                    }
                    @Override public void flush() {}
                    @Override public void close() {}
                });
            } catch (LimiteTexto recorte) {
                return texto.toString();
            }
            return texto.toString();
        }
    }

    private static final class LimiteTexto extends IOException {}

    static String textoDocx(byte[] datos) throws IOException {
        byte[] xml = documentoZip(datos);
        if (xml == null) return "";
        try {
            String texto = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(xml)).toString();
            return CanvasPolitica.textoPrograma(texto.replaceAll("<w:tab\\s*/>", "\t")
                .replaceAll("<w:br\\s*/>", "<br>")
                .replaceAll("</w:p>(\\s*</w:tc>)", "$1")
                .replace("</w:p>", "</p>").replace("</w:tc>", "</td>").replace("</w:tr>", "</tr>"));
        } catch (CharacterCodingException error) {
            return "";
        }
    }

    // Como en Swift, busca el único XML necesario en el directorio central.
    // No expande el resto de entradas ni escribe archivos extraídos.
    private static byte[] documentoZip(byte[] datos) throws IOException {
        ByteBuffer zip = ByteBuffer.wrap(datos).order(ByteOrder.LITTLE_ENDIAN);
        int fin = datos.length - 22;
        while (fin >= Math.max(0, datos.length - 65_557) && zip.getInt(fin) != 0x06054b50) fin--;
        if (fin < Math.max(0, datos.length - 65_557)) return null;
        int entradas = u16(zip, fin + 10);
        int pos = zip.getInt(fin + 16);
        if (entradas < 1 || entradas >= 10_000) return null;
        for (int i = 0; i < entradas; i++) {
            if (pos < 0 || pos > datos.length - 46 || zip.getInt(pos) != 0x02014b50) return null;
            int largo = u16(zip, pos + 28);
            if (largo > datos.length - pos - 46) return null;
            String nombre = new String(datos, pos + 46, largo, StandardCharsets.UTF_8);
            if (nombre.equals("word/document.xml")) {
                int local = zip.getInt(pos + 42);
                int comprimido = zip.getInt(pos + 20);
                int real = zip.getInt(pos + 24);
                int metodo = u16(zip, pos + 10);
                if (local < 0 || local > datos.length - 30 || zip.getInt(local) != 0x04034b50
                    || comprimido < 0 || real < 1 || real > MAX_XML) return null;
                int desde = local + 30 + u16(zip, local + 26) + u16(zip, local + 28);
                if (comprimido > datos.length - desde) return null;
                ByteArrayInputStream contenido = new ByteArrayInputStream(datos, desde, comprimido);
                if (metodo == 0) return CanvasHttp.bytes(contenido, real);
                if (metodo != 8) return null;
                Inflater inflater = new Inflater(true);
                try (InflaterInputStream entrada = new InflaterInputStream(contenido, inflater)) {
                    return CanvasHttp.bytes(entrada, real);
                } finally {
                    inflater.end();
                }
            }
            pos += 46 + largo + u16(zip, pos + 30) + u16(zip, pos + 32);
        }
        return null;
    }

    private static int u16(ByteBuffer datos, int indice) { return Short.toUnsignedInt(datos.getShort(indice)); }
}
