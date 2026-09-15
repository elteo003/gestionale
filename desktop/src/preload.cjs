const { contextBridge, ipcRenderer } = require('electron');

const config = ipcRenderer.sendSync('jeins:config');

contextBridge.exposeInMainWorld('jeins', {
    isDesktop: true,
    apiUrl: config.apiUrl,
    setAuthToken: (token) => ipcRenderer.invoke('jeins:set-token', token),
    clearAuth: () => ipcRenderer.invoke('jeins:clear-token'),
    onNavigate: (handler) => {
        const wrapped = (_event, url) => handler(url);
        ipcRenderer.on('jeins:navigate', wrapped);
        return () => ipcRenderer.removeListener('jeins:navigate', wrapped);
    },
});
