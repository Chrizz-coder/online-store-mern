export type User = {
  id:string;
  name:string;
  email:string;
  role:"customer" | "admin"
};

export type LoginInput = {
  email:string;
  password:string;
};

export type RegisterInput = {
  name:string;
  email:string;
  password:string;
}

export type AuthResponse = {
  message:string;
  token:string;
  user:User;
};

export type ApiErrorResponse = {
  success?: boolean;
  message?:string;
}