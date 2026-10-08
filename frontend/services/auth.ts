import {
  AuthResponse,
  LoginInput,
  RegisterInput,
  ApiErrorResponse,
} from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function getErrorMessage(response: Response): Promise<string> {
  const data = (await response
    .json()
    .catch(() => null)) as ApiErrorResponse | null;

  return data?.message || "Something went wrong.Please try again.";
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
  return response.json() as Promise<AuthResponse>;
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/user/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if(!response.ok){
    throw new Error(await getErrorMessage(response));
    
  }
  return response.json() as Promise<AuthResponse>;
}

export async function getProfile(token:string) {
  const response = await fetch(`${API_URL}/api/user/profile`,{
    headers:{
      Authorization:`Bearer ${token}`,
    },
  });

  if(!response.ok){
    throw new Error(await getErrorMessage(response));
  }

  return response.json();
}