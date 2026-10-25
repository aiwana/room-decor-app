/**
 * src/services/api-error.ts
 * Moi loi khi goi backend deu duoc doi thanh 1 kieu duy nhat: ApiError.
 * Man hinh chi can goi getErrorMessage(error) de lay cau tieng Viet de hieu.
 *
 * Backend Spring Boot tra loi theo dang (GlobalExceptionHandler):
 *   { "timestamp": "...", "status": 400, "message": "...", "errors": { "email": "..." } }
 * 401 = chua dang nhap / token het han, 403 = khong du quyen.
 */
import { isAxiosError } from 'axios';

export type ApiErrorKind =
  | 'network' // khong ket noi duoc may chu (sai IP, backend chua chay, mat mang)
  | 'timeout' // may chu tra loi qua lau
  | 'http' // may chu tra ve ma loi 4xx / 5xx
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** Ma HTTP (chi co khi kind = 'http') */
  readonly status?: number;
  /** Loi theo tung o nhap, vd { email: 'must be a well-formed email address' } */
  readonly fieldErrors?: Record<string, string>;

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: { status?: number; fieldErrors?: Record<string, string> } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options.status;
    this.fieldErrors = options.fieldErrors;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const readServerMessage = (data: unknown): { message?: string; fieldErrors?: Record<string, string> } => {
  if (!isRecord(data)) return {};
  const message = typeof data.message === 'string' && data.message.trim() ? data.message : undefined;
  let fieldErrors: Record<string, string> | undefined;
  if (isRecord(data.errors)) {
    fieldErrors = {};
    for (const [key, value] of Object.entries(data.errors)) {
      if (typeof value === 'string') fieldErrors[key] = value;
    }
  }
  return { message, fieldErrors };
};

const messageForStatus = (status: number): string => {
  if (status === 400 || status === 422) return 'Dữ liệu gửi lên chưa hợp lệ.';
  if (status === 401) return 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập.';
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 404) return 'Không tìm thấy dữ liệu (404).';
  if (status === 409) return 'Dữ liệu bị trùng (409).';
  if (status === 413) return 'Ảnh quá lớn, máy chủ không nhận.';
  if (status >= 500) return 'Máy chủ đang gặp lỗi, vui lòng thử lại sau.';
  return `Yêu cầu thất bại (mã ${status}).`;
};

/** Doi bat ky loi nao (axios, Error, string...) thanh ApiError */
export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('timeout', 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
    }
    if (error.response) {
      const { status, data } = error.response;
      const server = readServerMessage(data);
      return new ApiError('http', server.message ?? messageForStatus(status), {
        status,
        fieldErrors: server.fieldErrors,
      });
    }
    return new ApiError(
      'network',
      'Không kết nối được máy chủ. Kiểm tra mạng, địa chỉ API và backend đã chạy chưa.',
    );
  }

  if (error instanceof Error && error.message) {
    return new ApiError('unknown', error.message);
  }
  return new ApiError('unknown', 'Đã có lỗi xảy ra. Vui lòng thử lại.');
};

/** Cau thong bao tieng Viet de hien cho nguoi dung */
export const getErrorMessage = (error: unknown): string => toApiError(error).message;
