package cl.gradehub.app;

import static org.junit.Assert.*;

import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Protocol;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.json.JSONArray;
import org.junit.Test;

public class CanvasHttpTest {
    private static final String TOKEN = "0~" + "A".repeat(24);
    private static final String ARCHIVO = "https://cursos.canvas.uc.cl/files/55/download";

    private Response.Builder respuesta(Request pedido, int codigo) {
        return new Response.Builder().request(pedido).code(codigo).protocol(Protocol.HTTP_1_1)
            .message("Sintética").body(ResponseBody.create("[]", MediaType.get("application/json")));
    }

    @Test public void bloqueaRedirectsDeApiYPaginasFueraDeLaRuta() {
        CanvasHttp redireccion = new CanvasHttp(new OkHttpClient.Builder().addInterceptor(cadena ->
            respuesta(cadena.request(), 302).header("Location", CanvasPolitica.API + "users/self").build()));
        assertEquals(302, assertThrows(CanvasHttp.Fallo.class, () ->
            redireccion.pedir("courses", Collections.emptyList(), TOKEN, false)).codigo);
        CanvasHttp paginas = new CanvasHttp(new OkHttpClient.Builder().addInterceptor(cadena ->
            respuesta(cadena.request(), 200).header("Link", "<" + CanvasPolitica.API + "users/self?page=2>; rel=\"next\"").build()));
        assertEquals(0, assertThrows(CanvasHttp.Fallo.class, () ->
            paginas.pedir("courses", Collections.emptyList(), TOKEN, false)).codigo);
    }

    @Test public void laDescargaSiguienteSaleSinTokenNiCookies() throws Exception {
        List<Request> pedidos = new ArrayList<>();
        CanvasHttp red = new CanvasHttp(new OkHttpClient.Builder().addInterceptor(cadena -> {
            Request pedido = cadena.request();
            pedidos.add(pedido);
            return pedidos.size() == 1
                ? respuesta(pedido, 302).header("Location", "https://archivos.instructure.com/sintetico")
                    .header("Set-Cookie", "sintetica=valor").build()
                : respuesta(pedido, 200).build();
        }));
        red.descargar(URI.create(ARCHIVO), TOKEN);
        assertEquals(2, pedidos.size());
        assertEquals("Bearer " + TOKEN, pedidos.get(0).header("Authorization"));
        assertNull(pedidos.get(1).header("Authorization"));
        assertNull(pedidos.get(1).header("Cookie"));
        assertEquals("GET", pedidos.get(1).method());
    }

    @Test public void topesDePaginasYDeBytesAcumulados() throws Exception {
        List<Request> pedidos = new ArrayList<>();
        CanvasHttp red = new CanvasHttp(new OkHttpClient.Builder().addInterceptor(cadena -> {
            Request pedido = cadena.request();
            pedidos.add(pedido);
            return respuesta(pedido, 200).header("Link",
                "<" + CanvasPolitica.API + "courses?page=" + (pedidos.size() + 1) + ">; rel=\"next\"").build();
        }));
        assertEquals(0, ((JSONArray) red.pedir("courses", Collections.emptyList(), TOKEN, false)).length());
        assertEquals(10, pedidos.size());
        String datos = "[\"" + "x".repeat(1_200_000) + "\"]";
        CanvasHttp pesada = new CanvasHttp(new OkHttpClient.Builder().addInterceptor(cadena ->
            respuesta(cadena.request(), 200)
                .header("Link", "<" + CanvasPolitica.API + "courses?page=2>; rel=\"next\"")
                .body(ResponseBody.create(datos, MediaType.get("application/json"))).build()));
        assertEquals(0, assertThrows(CanvasHttp.Fallo.class, () ->
            pesada.pedir("courses", Collections.emptyList(), TOKEN, false)).codigo);
    }
}
