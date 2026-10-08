"use client";

import {
  createContext,useContext,useEffect,useState,type ReactNode
} from "react";

import {
  login as loginRequest,
  register as registerRequest
} from "@/services/auth";

import type {
  AuthResponse,LoginInput,RegisterInput,User
} from "@/types/auth"

type AuthContextValue = {
  user:User | null;
  token:string | null;
  isAuthenticated:boolean;
  isLoading:boolean;
  login: (input:LoginInput) => Promise<AuthResponse>;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  logout: () => void;

}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);


export function AuthProvider({children}:{children:ReactNode}) {
  const [user,setUser] = useState<User | null>(null);
  const [token,setToken] = useState<string | null>(null);
  const [isLoading,setIsLoading] = useState(true);

  useEffect(() =>{
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if(storedToken && storedUser){
      try{
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as User);
      }
      catch{
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);

  },[]);

  const saveAuth = (data:AuthResponse) =>{
    localStorage.setItem("token",data.token);
    localStorage.setItem("user",JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
  }

  const login = async (input: LoginInput) => {
    const data = await loginRequest(input);
    saveAuth(data);
    return data;

  };

  const register = async (input:RegisterInput) => {
    const data = await registerRequest(input);
    saveAuth(data);
    return data;
  }

  const logout = () =>{
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        register,
        logout,
      }}
      >
        {children}
      </AuthContext.Provider>
  )
}

export function useAuth(){
  const context = useContext(AuthContext);

  if(!context){
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}