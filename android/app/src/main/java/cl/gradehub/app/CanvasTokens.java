package cl.gradehub.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** La actividad puede recrearse mientras Canvas responde. La exclusión es por proceso. */
final class CanvasTokens {
    private static final String LLAVERO = "AndroidKeyStore";
    private static final String ARCHIVO = "gradehub_canvas_tokens";
    private static final String CIPHER = "AES/GCM/NoPadding";
    private final Map<String, UUID> pendientes = new HashMap<>();
    private final SharedPreferences datos;

    CanvasTokens(Context contexto) {
        datos = contexto.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE);
    }

    static final class Lectura {
        final String token;
        final String cifrado;

        Lectura(String token, String cifrado) {
            this.token = token;
            this.cifrado = cifrado;
        }
    }

    synchronized UUID iniciar(String cuenta) {
        UUID revision = UUID.randomUUID();
        pendientes.put(cuenta, revision);
        return revision;
    }

    private boolean vigente(String cuenta, UUID revision) {
        return revision.equals(pendientes.get(cuenta));
    }

    synchronized boolean terminar(String cuenta, UUID revision, String token) throws Exception {
        if (!vigente(cuenta, revision)) return false;
        pendientes.remove(cuenta);
        if (token == null) return true;
        Cipher cipher = Cipher.getInstance(CIPHER);
        cipher.init(Cipher.ENCRYPT_MODE, llave(cuenta, true));
        cipher.updateAAD(cuenta.getBytes(StandardCharsets.UTF_8));
        byte[] texto = token.getBytes(StandardCharsets.UTF_8);
        try {
            byte[] cifrado = cipher.doFinal(texto);
            byte[] iv = cipher.getIV();
            if (iv.length != 12) throw new IllegalStateException();
            String paquete = Base64.encodeToString(ByteBuffer.allocate(iv.length + cifrado.length).put(iv).put(cifrado).array(), Base64.NO_WRAP);
            if (!datos.edit().putString(cuenta, paquete).commit()) throw new IllegalStateException();
        } finally {
            Arrays.fill(texto, (byte) 0);
        }
        return true;
    }

    synchronized Lectura leer(String cuenta) throws Exception {
        String paquete = datos.getString(cuenta, null);
        if (paquete == null) return null;
        SecretKey llave = llave(cuenta, false);
        if (llave == null) {
            borrar(cuenta);
            return null;
        }
        byte[] cifrado = Base64.decode(paquete, Base64.NO_WRAP);
        if (cifrado.length <= 12 + 16) throw new IllegalStateException();
        Cipher cipher = Cipher.getInstance(CIPHER);
        cipher.init(Cipher.DECRYPT_MODE, llave, new GCMParameterSpec(128, cifrado, 0, 12));
        cipher.updateAAD(cuenta.getBytes(StandardCharsets.UTF_8));
        byte[] texto = cipher.doFinal(cifrado, 12, cifrado.length - 12);
        try {
            String token = new String(texto, StandardCharsets.UTF_8);
            if (!CanvasPolitica.tokenValido(token)) throw new IllegalStateException();
            return new Lectura(token, paquete);
        } finally {
            Arrays.fill(texto, (byte) 0);
        }
    }

    synchronized boolean vigente(String cuenta, Lectura lectura) {
        return lectura.cifrado.equals(datos.getString(cuenta, null));
    }

    synchronized void revocar(String cuenta, Lectura lectura) throws Exception {
        if (vigente(cuenta, lectura)) borrar(cuenta);
    }

    synchronized boolean desconectar(String cuenta) throws Exception {
        pendientes.remove(cuenta);
        return borrar(cuenta);
    }

    private boolean borrar(String cuenta) throws Exception {
        llavero().deleteEntry(alias(cuenta));
        return datos.edit().remove(cuenta).commit();
    }

    private static String alias(String cuenta) { return "cl.gradehub.canvas." + cuenta; }

    private static KeyStore llavero() throws Exception {
        KeyStore llavero = KeyStore.getInstance(LLAVERO);
        llavero.load(null);
        return llavero;
    }

    private static SecretKey llave(String cuenta, boolean crear) throws Exception {
        String alias = alias(cuenta);
        SecretKey llave = (SecretKey) llavero().getKey(alias, null);
        if (llave != null || !crear) return llave;
        KeyGenerator generador = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, LLAVERO);
        generador.init(new KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256).setRandomizedEncryptionRequired(true).build());
        return generador.generateKey();
    }
}
