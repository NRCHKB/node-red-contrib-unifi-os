type Controllers = {
    login: {
        url: string
        retry: number
    }
    logout: {
        url: string
    }
    wsport: number
}

type Endpoints = {
    protocol: {
        base: string
        webSocket: string
    }
    UniFiOSConsole: Controllers
    UniFiNetworkApplication: Controllers
}

export const endpoints: Endpoints = {
    protocol: {
        base: 'https://',
        webSocket: 'wss://',
    },
    UniFiOSConsole: {
        login: {
            url: '/api/auth/login',
            retry: 5000,
        },
        logout: {
            url: '/api/auth/logout',
        },
        wsport: 443,
    },
    UniFiNetworkApplication: {
        login: {
            url: '/api/login',
            retry: 5000,
        },
        logout: {
            url: '/api/logout',
        },
        wsport: 8443,
    },
}
