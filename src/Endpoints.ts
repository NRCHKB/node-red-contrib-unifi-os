type Endpoints = {
    protocol: {
        base: string
        webSocket: string
    }
    login: {
        url: string
        retry: number
    }
    logout: {
        url: string
    }
}

export const endpoints: Endpoints = {
    protocol: {
        base: 'https://',
        webSocket: 'wss://',
    },
    login: {
        url: '/api/auth/login',
        retry: 5000,
    },
    logout: {
        url: '/api/logout',
    },
}
