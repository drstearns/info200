//@ts-check
(function() {
    "use strict";
    if (!window.crypto || !window.crypto.subtle) {
        alert("sorry your browser doesn't support the Web Cryptography API. Try using a recent version of Chrome or Firefox.");
        return;
    }
    
    const ALGO_NAME = "RSA-OAEP";
    const HASH_NAME = "SHA-512";
    const STORAGE_PRIV_KEY = "priv-key";
    const STORAGE_PUB_KEY = "pub-key";
    const KEY_OPS = ["encrypt", "decrypt"];
    
    const GEN_KEY_PAIR = /** @type {HTMLButtonElement} */(document.querySelector("#key-pair-button"));
    const EXPORTED_PUB_KEY = /** @type {HTMLInputElement} */ (document.querySelector("#exported-public-key"));
    const DECRYPT_BUTTON = /** @type {HTMLButtonElement} */(document.querySelector("#decrypt"));
    const ENCRYPT_BUTTON = /** @type {HTMLButtonElement} */(document.querySelector("#encrypt"));
    const ENCRYPTED = /** @type {HTMLTextAreaElement} */(document.querySelector("#encrypted"));
    const RECIPIENT_PUB_KEY = /** @type {HTMLInputElement} */(document.querySelector("#recipient-public-key"));
    const MSG_TO_ENCRYPT = /** @type {HTMLInputElement} */(document.querySelector("#message-to-encrypt"));
    const MSG_TO_DECRYPT = /** @type {HTMLInputElement} */(document.querySelector("#message-to-decrypt"));
    const DECRYPTED = /** @type {HTMLInputElement} */(document.querySelector("#decrypted"));

    /**
     * encodes an ArrayBuffer into a base64 string
     * @param {ArrayBuffer} arrayBuffer 
     */
    function toBase64(arrayBuffer) {
        return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    }
    
    /**
     * decodes a base64 string into an ArrayBuffer
     * @param {string} base64 
     * @returns {ArrayBuffer}
     */
    function fromBase64(base64) {
        var binary_string = window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array( len );
        for (var i = 0; i < len; i++)        {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;    
    }
    
    /**
     * converts a string to an ArrayBuffer
     * @param {string} text 
     * @returns {ArrayBuffer}
     */
    function toArrayBuffer(text) {
        //@ts-ignore
        let encoder = new TextEncoder("utf-8");
        return encoder.encode(text);
    }
    
    /**
     * converts an ArrayBuffer back into a string
     * @param {ArrayBuffer} buffer 
     * @returns {string}
     */
    function fromArrayBuffer(buffer) {
        //@ts-ignore
        let decoder = new TextDecoder("utf-8");
        return decoder.decode(buffer);
    }
    
    /**
     * generates a new asymmetric key pair
     * @returns {PromiseLike<CryptoKeyPair>}
     */
    function generateKeyPair() {
        return crypto.subtle.generateKey({
            name: ALGO_NAME,
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: {name: HASH_NAME}            
        }, false, KEY_OPS);
    }
    
    /**
     * exports the public key into a form that users
     * can share with other
     * @param {CryptoKeyPair} keyPair 
     * @returns {PromiseLike<ArrayBuffer>}
     */
    function exportPublicKey(keyPair) {
        return crypto.subtle.exportKey("spki", keyPair.publicKey);
    }
    
    /**
     * imports a public key that was exported
     * @param {ArrayBuffer} pubKey
     * @returns {PromiseLike<CryptoKey>}
     */
    function importPublicKey(pubKey) {
        return crypto.subtle.importKey("spki", 
            pubKey, 
            {name: ALGO_NAME, hash: {name: HASH_NAME}}, 
            false, ["encrypt"]);
    }
    
    /**
     * encrypts the text using the key
     * @param {CryptoKey} key 
     * @param {string} plainText 
     * @returns {PromiseLike<ArrayBuffer>}
     */
    function encrypt(key, plainText) {
        return crypto.subtle.encrypt(ALGO_NAME, key, toArrayBuffer(plainText));
    }
    
    /**
     * decrypts the buffer using the key
     * @param {CryptoKey} key 
     * @param {ArrayBuffer} buffer 
     * @returns {PromiseLike<ArrayBuffer>}
     */
    function decrypt(key, buffer) {
        return crypto.subtle.decrypt(ALGO_NAME, key, buffer);
    }
    
    function setEncryptDisabled() {
        ENCRYPT_BUTTON.disabled = (RECIPIENT_PUB_KEY.value.length === 0 || MSG_TO_ENCRYPT.value.length === 0);
    }
    function setDecryptDisabled() {
        DECRYPT_BUTTON.disabled = (!keyPair || !keyPair.privateKey || MSG_TO_DECRYPT.value.length === 0);
    }
    function showCopyFeedback(elem) {
        let feedback = elem.parentElement.querySelector(".copy-feedback");
        if (feedback) {
            let oldContent = feedback.textContent;
            feedback.textContent = "(copied to clipboard!)";
            feedback.classList.add("copied");
            setTimeout(() => {
                feedback.textContent = oldContent
                feedback.classList.remove("copied");
            }, 2000);    
        }
    }
    
    /** @type {CryptoKeyPair} */
    let keyPair;
    
    GEN_KEY_PAIR.addEventListener("click", evt => {
        GEN_KEY_PAIR.disabled = true;
        GEN_KEY_PAIR.querySelector(".working").classList.remove("d-none");
        generateKeyPair()
            .then(kp => {
                keyPair = kp;
                return exportPublicKey(kp);
            })
            .then(exportedKeyBuf => {
                let exportedKey64 = toBase64(exportedKeyBuf);
                EXPORTED_PUB_KEY.value = exportedKey64;
                setDecryptDisabled();
            })
            .then(undefined, err => {
                console.error(err);
                alert("There was a problem generating the new key pair, or exporting the public key:\n" + err.message);
            })
            .then(() => {
                GEN_KEY_PAIR.disabled = false;
                GEN_KEY_PAIR.querySelector(".working").classList.add("d-none");
            });
    });

    EXPORTED_PUB_KEY.addEventListener("click", () => {
        EXPORTED_PUB_KEY.setSelectionRange(0, EXPORTED_PUB_KEY.value.length);
        if (document.execCommand) {
            if (document.execCommand("copy")) {
                showCopyFeedback(EXPORTED_PUB_KEY);
            }
        }
    });
    RECIPIENT_PUB_KEY.addEventListener("input", setEncryptDisabled);
    MSG_TO_ENCRYPT.addEventListener("input", setEncryptDisabled);
    
    ENCRYPT_BUTTON.addEventListener("click", evt => {
        let message = MSG_TO_ENCRYPT.value;
        let recipientPubKey = RECIPIENT_PUB_KEY.value
        if (recipientPubKey.length === 0) {
            alert("Paste the recipient's public key.");
            return;
        }

        let pubKeyBuf;
        try {
            pubKeyBuf = fromBase64(recipientPubKey)
        } catch(err) {
            alert("Could not decode that public key: make sure you copied/pasted all the characters.");
            return;
        }

        importPublicKey(pubKeyBuf)
            .then(pubKey => {
                return encrypt(pubKey, message);
            })
            .then(cipherBuffer => {
                let b64cipher = toBase64(cipherBuffer);
                ENCRYPTED.value = b64cipher
            })
            .then(undefined, err => {
                alert("Could not encrypt the message: make sure you copied/pasted all of the public key");
            });
    });
    
    ENCRYPTED.addEventListener("click", () => {
        ENCRYPTED.setSelectionRange(0, ENCRYPTED.value.length);
        if (document.execCommand) {
            if (document.execCommand("copy")) {
                showCopyFeedback(ENCRYPTED);
            }
        }        
    });
    MSG_TO_DECRYPT.addEventListener("input", setDecryptDisabled);

    DECRYPT_BUTTON.addEventListener("click", evt => {
        if (!keyPair || !keyPair.privateKey) {
            alert("Generate a key pair first.");
            return;
        }

        DECRYPTED.value = "";
        let message = MSG_TO_DECRYPT.value;
        let buf;
        try {
            buf = fromBase64(message);
        } catch (err) {
            alert("The encrypted message appears to be corrupted. Make sure you pasted all the characters!");
            return;
        }
        decrypt(keyPair.privateKey, buf)
            .then(plainBuf => {
                let plainText = fromArrayBuffer(plainBuf);
                DECRYPTED.value = plainText;
            })
            .then(undefined, err => {
                alert("Unable to decrypt the message. Make sure the sender is encrypting using your public key!");
            });
    });    
})();

