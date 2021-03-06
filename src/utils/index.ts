import { Request, Response } from 'express'
import { RefreshAccessTokenResponse } from 'google-auth-library/build/src/auth/oauth2client'
import * as R from 'rambda'
import { Claims } from '../types/customContext'
import { getUserProfile, validateToken } from './auth'

export const parseCookies = (request: Request): Request => {
    const list = {},
        rc = request.headers.cookie

    rc &&
        rc.split(';').forEach(function (cookie: any) {
            const parts = cookie.split('=')
            //@ts-ignore
            list[parts.shift().trim()] = decodeURI(parts.join('='))
        })

    return R.set(R.lensProp('cookies'), list, request)
}

export const getClaims = async (req: Request): Promise<Claims | null> => {
    if (!req?.cookies) {
        return null
    }
    const {
        cookies: { accessToken, idToken },
    } = req

    const [validAccessToken, validIdToken, userProfile] = await Promise.all([
        await validateToken(accessToken, 'accessToken'),
        await validateToken(idToken, 'idToken'),
        await getUserProfile(accessToken),
    ])

    if (validAccessToken && validIdToken && userProfile) {
        return userProfile
    }

    return null
}

export const setCookies =
    (_response: Response) =>
    (payload: Pick<RefreshAccessTokenResponse, 'credentials'>) => {
        const { access_token, refresh_token, id_token } = payload.credentials

        _response.cookie('accessToken', access_token, { httpOnly: true })
        _response.cookie('refreshToken', refresh_token, { httpOnly: true })
        _response.cookie('idToken', id_token, { httpOnly: true })
    }
