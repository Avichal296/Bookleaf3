import type {Request,Response,NextFunction} from 'express';
import jwt from 'jsonwebtoken';
export type Session={userId:string;role:'ADMIN'|'AUTHOR';name:string;email:string};
declare global { namespace Express { interface Request { session?:Session } } }
export function auth(req:Request,res:Response,next:NextFunction){const token=req.headers.authorization?.replace(/^Bearer\s+/i,'');if(!token)return res.status(401).json({error:'Sign in to continue'});try{req.session=jwt.verify(token,process.env.JWT_SECRET!) as Session;next()}catch{return res.status(401).json({error:'Session expired. Please sign in again.'})}}
export function admin(req:Request,res:Response,next:NextFunction){if(req.session?.role!=='ADMIN')return res.status(403).json({error:'Administrator access required'});next()}
