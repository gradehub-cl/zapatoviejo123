package cl.gradehub.app;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.TimeUnit;
import okhttp3.HttpUrl;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONTokener;

final class CanvasHttp {
    private final OkHttpClient api;
    private final OkHttpClient archivos;

    CanvasHttp() { this(new OkHttpClient.Builder()); }

    CanvasHttp(OkHttpClient.Builder base) {
        api = base
            .followRedirects(false).followSslRedirects(false)
            .cookieJar(okhttp3.CookieJar.NO_COOKIES).cache(null)
            .callTimeout(20, TimeUnit.SECONDS).build();
        archivos = api.newBuilder().callTimeout(30, TimeUnit.SECONDS).build();
    }

    static final class Fallo extends Exception {
        final int codigo;

        Fallo(int codigo) { this.codigo = codigo; }

        String mensaje() {
            switch (codigo) {
                case 401: return "Canvas no aceptó el token. Puede que haya vencido o lo hayas borrado.";
                case 403: return "Canvas no permite esa consulta con tu cuenta.";
                case 0: return "No pudimos conectar con Canvas. Revisa tu conexión.";
                default: return "Canvas respondió con un error (" + codigo + ").";
            }
        }
    }

    Object pedir(String ruta, List<CanvasPolitica.Parametro> items, String token, boolean archivos) throws Fallo {
        boolean permitido = archivos
            ? CanvasPolitica.rutaArchivos(ruta) && CanvasPolitica.parametrosArchivos(ruta, items)
            : CanvasPolitica.parametrosValidos(ruta, items);
        if (!permitido) throw new Fallo(0);
        HttpUrl.Builder primera = HttpUrl.get(CanvasPolitica.API + ruta).newBuilder();
        for (CanvasPolitica.Parametro item : items) primera.addQueryParameter(item.nombre, item.valor);
        URI siguiente = primera.build().uri();
        JSONArray acumulado = new JSONArray();
        int leidos = 0;
        for (int pagina = 0; siguiente != null && pagina < CanvasPolitica.limitePaginas(ruta); pagina++) {
            if (!CanvasPolitica.urlValida(siguiente, ruta, archivos) || !CanvasPolitica.paginaAnunciosValida(siguiente, ruta)) {
                throw new Fallo(0);
            }
            Request pedido = new Request.Builder().url(siguiente.toString()).get()
                .header("Authorization", "Bearer " + token).header("Accept", "application/json").build();
            try (Response respuesta = api.newCall(pedido).execute()) {
                byte[] datos = bytes(respuesta.body(), CanvasPolitica.BYTES - leidos);
                leidos += datos.length;
                if (!respuesta.isSuccessful()) throw new Fallo(respuesta.code());
                JSONTokener json = new JSONTokener(new String(datos, StandardCharsets.UTF_8));
                Object resultado = json.nextValue();
                if (json.nextClean() != 0) throw new Fallo(0);
                if (!(resultado instanceof JSONArray)) return resultado;
                JSONArray lista = (JSONArray) resultado;
                for (int i = 0; i < lista.length(); i++) acumulado.put(lista.get(i));
                siguiente = paginaSiguiente(respuesta.header("Link"));
            } catch (IOException | JSONException | IllegalArgumentException e) {
                throw new Fallo(0);
            }
        }
        return acumulado;
    }

    static URI paginaSiguiente(String link) {
        if (link == null) return null;
        for (String parte : link.split(",")) {
            if (!parte.contains("rel=\"next\"")) continue;
            int inicio = parte.indexOf('<');
            int fin = parte.indexOf('>');
            if (inicio >= 0 && fin > inicio) return URI.create(parte.substring(inicio + 1, fin));
        }
        return null;
    }

    byte[] descargar(URI url, String token) throws IOException {
        if (!CanvasPolitica.descargaValida(url)) throw new IOException();
        URI destino = url;
        for (int salto = 0; salto <= 10; salto++) {
            Request.Builder pedido = new Request.Builder().url(destino.toString()).get();
            if (salto == 0) pedido.header("Authorization", "Bearer " + token);
            try (Response respuesta = archivos.newCall(pedido.build()).execute()) {
                if (respuesta.isSuccessful()) return bytes(respuesta.body(), CanvasPolitica.BYTES_ARCHIVO);
                String location = respuesta.header("Location");
                if (!respuesta.isRedirect() || location == null) break;
                destino = destino.resolve(location);
                if (!CanvasPolitica.redireccionValida(destino)) break;
            }
        }
        throw new IOException();
    }

    static byte[] bytes(ResponseBody cuerpo, int max) throws IOException {
        if (cuerpo == null) return new byte[0];
        try (InputStream entrada = cuerpo.byteStream()) {
            return bytes(entrada, max);
        }
    }

    static byte[] bytes(InputStream entrada, int max) throws IOException {
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        byte[] bloque = new byte[8192];
        int n;
        while ((n = entrada.read(bloque)) != -1) {
            if (n > max - salida.size()) throw new IOException();
            salida.write(bloque, 0, n);
        }
        return salida.toByteArray();
    }
}
