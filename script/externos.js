//ESSE ARQUIVO CONTEM SCRIPTS QUE ABRE LINKS EXTERNOS

/* ===================== ABRIR APP TREI.NO ===================== */
function abrirAppTreino() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /android/i.test(userAgent); //flag caso seja android
    const isIOS = /iPad|iPhone|iPod/.test(userAgent); //flag caso seja IOS

    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.trei.no';
    const appStoreUrl  = 'https://apps.apple.com/us/app/trei-no/id6737131074';
    const scheme       = 'trei-no://'; // tenta abrir o app direto (fallback logo abaixo)

    // Android: abre o app via Intent, cai na Play Store se não tiver
    if (isAndroid) {
        const intentUrl = 'intent://#Intent;package=com.trei.no;S.browser_fallback_url=' +
                          encodeURIComponent(playStoreUrl) +
                          ';end';
                        window.location.href = intentUrl;
    // iOS: tenta abrir o app via custom scheme; se falhar, vai pra App Store                    
    } else if (isIOS) {
        const inicio = Date.now(); //pega o momento exato que o usuario clicou no card
        window.location.href = scheme;
        // Se em 1.5s a página ainda estiver visível, o app não abriu → redireciona
        setTimeout(() => {
            if (Date.now() - inicio < 2000 && !document.hidden) {
                window.location.href = appStoreUrl;
            }
        }, 1500);
    } else {
        // Desktop: abre a Play Store numa nova aba
        window.open(playStoreUrl, '_blank');
    }
}

// exporta pra caso outro módulo queira importar
export { abrirAppTreino };