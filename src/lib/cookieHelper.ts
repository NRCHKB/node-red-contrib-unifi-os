type CookieRaw = string
type CookieObject = { [key: string]: string }

export const cookieToObject = (raw: CookieRaw): CookieObject => {
    const cookies: { [key: string]: string } = {}

    raw.replace(/ /g, '')
        .split(';')
        .forEach((c) => {
            if (c.includes('=')) {
                const [key, value] = c.split('=')
                cookies[key] = value
            } else {
                cookies[c] = ''
            }
        })

    return cookies
}

export const cookieToRaw = (cookie: CookieObject): CookieRaw => {
    let raw = ''

    Object.keys(cookie).forEach((key) => {
        const value = cookie[key]
        raw += `${key}=${value};`
    })

    return raw
}
