type Endpoints = {
    protocol: {
        base: string
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
    },
    login: {
        url: '/api/auth/login',
        retry: 5000,
    },
    logout: {
        url: '/api/logout',
    },
}
