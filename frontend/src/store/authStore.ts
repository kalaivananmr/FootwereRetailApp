import { create } from 'zustand';
import type { User, Shop } from '../types';
interface AuthState { user: User|null; shop: Shop|null; token: string|null; setAuth:(token:string,user:User,shop:Shop)=>void; updateShop:(shop:Shop)=>void; clearAuth:()=>void; }
const stored = { token: localStorage.getItem('sf_token'), user: (()=>{ try{ return JSON.parse(localStorage.getItem('sf_user')||'null'); }catch{ return null; } })(), shop: (()=>{ try{ return JSON.parse(localStorage.getItem('sf_shop')||'null'); }catch{ return null; } })() };
export const useAuthStore = create<AuthState>((set) => ({
  token: stored.token, user: stored.user, shop: stored.shop,
  setAuth: (token,user,shop) => { localStorage.setItem('sf_token',token); localStorage.setItem('sf_user',JSON.stringify(user)); localStorage.setItem('sf_shop',JSON.stringify(shop)); set({token,user,shop}); },
  updateShop: (shop) => { localStorage.setItem('sf_shop',JSON.stringify(shop)); set({shop}); },
  clearAuth: () => { localStorage.removeItem('sf_token'); localStorage.removeItem('sf_user'); localStorage.removeItem('sf_shop'); set({token:null,user:null,shop:null}); },
}));
