import { Member } from "../entities/Member";
import jwt from "jsonwebtoken";
import { Context } from "koa";

export const createAccessToken = ({ id }: Member) => {
  return jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: "15m",
  });
};

export const createRefreshToken = ({ id, token_version }: Member) => {
  return jwt.sign({ id, token_version }, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: "7d",
  });
};

export const setRefreshTokenIntoCookie = (
  ctx: Context,
  refreshToken: string
) => {
  return ctx.cookies.set("dami", refreshToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7 * 1000,
  });
};

export const deleteCookie = (ctx: Context) => {
  return ctx.cookies.set("dami");
};

export const verifyAccessToken = (accessToken: string) => {
  return jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!);
};

export const verifyRefreshToken = (refreshToken: string) => {
  return jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
};
