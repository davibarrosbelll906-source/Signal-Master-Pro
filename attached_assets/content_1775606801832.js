const pageUrl = "https://estrategiastarget.com/API/Options/Ebinex/";

(function() {
    var iframe = null,
        iframeSet = false,
        accountLoaded = false;
    var lowRes = window.innerHeight < 1200;

    const iframeUrl = pageUrl + 'v2-login-pc.php';

    var realSelector = ".MuiTypography-root.MuiTypography-body1.css-1qi5ig",
        balanceSelector = ".MuiTypography-root.MuiTypography-body1.css-1d386ca",
        symbolSelector = ".css-1gae7qx .MuiTypography-root.MuiTypography-body1.css-y6c33k",
        symbolSelector2 = ".css-1gae7qx .MuiTypography-root.MuiTypography-body1.css-y6c33k",
        symbolSelector3 = ".css-qns2ul .MuiTypography-root.MuiTypography-body1.css-y6c33k",
        timeframeSelector = ".MuiTypography-root.MuiTypography-body1.css-1tnfv4k";

    
    var sessionId = null,
        sessionType = null;

    function IFrame_Create() {
        if(iframeSet) return;
        iframe = document.createElement('iframe');
        iframe.src = iframeUrl;
        iframe.style.position = 'fixed';
        iframe.style.top = '80px';
        iframe.style.right = '0';
        iframe.style.width = '35%';
        iframe.style.height = 'calc(100% - 80px)';
        iframe.style.border = 'none';
        iframe.style.zIndex = '1';
        iframe.id = 'ultraIframe';

        // Adiciona o iframe ao body
        document.body.appendChild(iframe);
        iframeSet = true;
    }

    function Page_Fix() {
        try {
            document.querySelector('a[href="/traderoom"]').remove();
        } catch(e) {}

        document.body.style.width = '65%';
        document.body.style.marginRight = '35%';
    }

    // Listener para salvar dados e responder ao iframe
    let logginOut = false;
    window.addEventListener('message', (event) => {
        if (event.origin.indexOf('https://estrategiastarget.com') > -1) {
            const { action, value } = event.data;

            switch(action) {
                case 'load-dash':
                    Frame_LoadDash();
                    break;
                case 'load-chart-info':
                    try {
                        if(realSelector == "") {
                            console.log("[Erro] Seletores não carregados!");
                            return;
                        }
                        if(!Account_CheckReal(document)) break;

                        // Seleciona todos os elementos 'a' cujo href começa com a URL especificada
                        var finalSymbol = "", finalTimeframe = "";
                        var symbolElement = document.querySelector(symbolSelector) || document.querySelector(symbolSelector2) || document.querySelector(symbolSelector3),
                            timeframeElement = document.querySelector(timeframeSelector);
                        
                        if(symbolElement) finalSymbol = symbolElement.textContent.trim();

                        finalSymbol = finalSymbol.replace('/', '').replace('coin-', '').replace('-', '').replace('_', '').toUpperCase();
                        finalTimeframe = timeframeElement.textContent.trim().toLowerCase().replace('m', '');
                        event.source.postMessage({ action: 'load-chart-info', symbol: finalSymbol, timeframe: finalTimeframe }, event.origin);
                    } catch(e) {
                        console.log("Erro ao carregar >>> ");
                        console.log(e);
                    }
                    break;
                case 'session-load':
                    Session_Load(event, value ? JSON.parse(value)?.loadDash : false);
                    break;
                case 'session-save':
                    if(!Account_CheckReal(document, true)) break;

                    console.log("[Ok] Salvando sessão..");
                    chrome.storage?.local?.set({ sessionData: value }, () => {
                        console.log("Salvando >> ", value);
                        let data = JSON.parse(value);
                        sessionId = data.sessionId;
                        sessionType = data.sessionType;
                        console.log('[Ok] Sessão salva >> ', value);
                        Frame_LoadDash();
                        // event.source.postMessage({ action: 'session-save' }, event.origin);
                    });
                    break;
                case 'session-logout':
                    // Limpa o sessionData armazenado
                    console.log('[Ok] Sessão encerrando...');
                    chrome.storage?.local?.remove('sessionData', () => {
                        console.log('[Ok] Sessão finalizada com sucesso!');
                        event.source.postMessage({ action: 'session-logout' }, event.origin);
                    });
                    break;
            }
        }
    }, false);

    window.addEventListener('load', () => {
        // Verifica se o iframe já foi adicionado
        if (!document.getElementById('ultraIframe')) {
            setTimeout(() => {
                Page_Fix();
                IFrame_Create();
            }, 3000);
        }
    });
    
    function Account_Logout() {
        accountLoaded = false;
        chrome.storage?.local?.get('sessionData', (r) => {
            if(Object.keys(r).length > 0) {
                chrome.storage?.local?.remove('sessionData', () => {
                    console.log('[Ok] Sessão finalizada com sucesso!');
                    if(event) event.source.postMessage({ action: 'session-logout' }, event.origin);
                    else iframe.src = pageUrl + "v2-login-pc.php";
                });
            }
        });
    }

    function Account_CheckReal(d, forcePrint = false) {
        if(realSelector == "") return false;
        let realDemoElement = d.querySelector(realSelector);
        if(realDemoElement && realDemoElement.innerHTML.toLowerCase().indexOf('real') > -1) {
            if(Account_CheckBalance(d, forcePrint)) return true;
        } 
        console.log("[Erro] Conta não real!");
        if(forcePrint || accountLoaded) alert("[EBINEX ULTRA v2]\nIndicador liberado apenas para conta REAL!");
        Account_Logout();
        return false;
    }

    function Account_CheckBalance(d, forcePrint = false) {
        let balanceElement = d.querySelector(balanceSelector);
        if(balanceElement && parseFloat(balanceElement.innerHTML.replace("$", "").replace(/,/g, "")) >= 1) return true;
        if(forcePrint || accountLoaded) alert("[EBINEX ULTRA v2]\nAdicione saldo para usar o indicador!");
        Account_Logout();
        return false;
    }

    function Frame_LoadDash(event = null) {
        if(realSelector == "") return;
        if(!Account_CheckReal(document)) return;
        // Redireciona para a página de usuários
        iframe.src = pageUrl + "v2-dash-pc.html?v=2.0.1&sessionId=" + sessionId+"&sessionType="+sessionType;
        accountLoaded = true;
    }

    function Session_Load(event = null, loadDash = false) {
        chrome.storage?.local?.get('sessionData', (data) => {
            if (!data.sessionData) {
                if(event) event.source.postMessage({ action: 'session-logout' }, event.origin);
                return;
            }

            try {
                let result = JSON.parse(data.sessionData);
                if (result.sessionId) {
                    accountLoaded = true;
                    sessionId = result.sessionId;
                    sessionType = result.sessionType;
                    console.log('Session ID restored:', result.sessionId);
                    console.log("DADOS DA SESSAO >>> ", result);
                    console.log("LOAD DASH >>> ", loadDash);
                    if(event) {
                         event.source.postMessage({ 
                            action: 'session-load', 
                            sessionId: result.sessionId, 
                            sessionType: result.sessionType, 
                            alertStatus: result.alertStatus, 
                            alertVolume: result.alertVolume 
                        }, event.origin);
                    }
                    if(loadDash) Frame_LoadDash();
                }
            } catch (e) {
                console.error("Failed to parse sessionData:", e);
                // Clear corrupted data and logout
                chrome.storage?.local?.remove('sessionData', () => {
                     if(event) event.source.postMessage({ action: 'session-logout' }, event.origin);
                });
            }
        });
    }

    async function Selectors_Load() {
        let response = await fetch(pageUrl + 'assets/json/ebinex-selectors.json?v=2.0.1', {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        let data = await response.json();
        realSelector = data.realSelector;
        balanceSelector = data.balanceSelector;
        symbolSelector = data.symbolSelector;
        symbolSelector2 = data.symbolSelector2;
        symbolSelector3 = data.symbolSelector3;
        timeframeSelector = data.timeframeSelector;
    }
    Selectors_Load();
})();
