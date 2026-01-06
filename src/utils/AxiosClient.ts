/// <reference types="next" />
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

// Interface lỗi
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

// 1. CHUẨN HÓA ENV (Ví dụ dùng Next.js)
const BASE_URL: string = process.env.NEXT_PUBLIC_API_URL || 'https://jsonplaceholder.typicode.com1';
const TIMEOUT: number = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 20000;

class HttpService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: BASE_URL,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 2. XỬ LÝ REQUEST: Tự động gắn Token
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Lấy token từ LocalStorage hoặc Cookie
        // Lưu ý: Cần kiểm tra window nếu chạy Next.js (SSR)
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('accessToken'); 
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error),
    );

    // Xử lý Response
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError<ApiErrorResponse>) => this.handleError(error),
    );
  }

  private handleError(error: AxiosError<ApiErrorResponse>) {
    if (error.response) {
      // Có thể trigger notification (Toast) ở đây
      console.error(`🔴 API Error [${error.response.status}]:`, error.response.data.message);
      
      // Xử lý logout nếu 401 Unauthorized
      if (error.response.status === 401) {
          // logic logout, clear storage, redirect login...
      }
    } else {
        console.error(`🔴 Network Error:`, error.message);
    }
    return Promise.reject(error);
  }

  // --- METHODS ---

  // Update logic type: 
  // R = Response Type (dữ liệu thực tế backend trả về)
  // D = Data Type (dữ liệu gửi đi trong body)

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    // AxiosResponse<T> nghĩa là response.data sẽ có kiểu T
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  public async post<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  public async put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }
  
  public async patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }
}

// Export instance duy nhất (Singleton)
const http = new HttpService();
export default http;