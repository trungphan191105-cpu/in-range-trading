import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      res.status(400).json({ error: error.errors ? error.errors[0].message : 'Validation failed' });
    }
  };
}

export const loginSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }),
  password: z.string().min(1, { message: 'Mật khẩu không được để trống' }),
});

export const registerSchema = z.object({
  name: z.string().min(1, { message: 'Tên không được để trống' }),
  email: z.string().email({ message: 'Email không hợp lệ' }),
  password: z.string().min(6, { message: 'Mật khẩu phải dài ít nhất 6 ký tự' }),
});

export const createPlanSchema = z.object({
  date: z.string().min(1, { message: 'Ngày không được để trống' }),
  title: z.string().min(1, { message: 'Tiêu đề không được để trống' }),
  market_bias: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  screenshot_url: z.string().optional().nullable(),
  screenshots: z.array(z.any()).optional(),
});

export const updatePlanSchema = z.object({
  date: z.string().optional(),
  title: z.string().optional(),
  market_bias: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  status: z.string().optional(),
  screenshot_url: z.string().optional().nullable(),
  screenshots: z.array(z.any()).optional(),
  grade: z.string().optional().nullable(),
  grade_comment: z.string().optional().nullable(),
});

export const createJournalSchema = z.object({
  date: z.string().min(1, { message: 'Ngày không được để trống' }),
  type: z.string().min(1, { message: 'Loại nhật ký không được để trống' }),
  symbol: z.string().optional().nullable(),
  direction: z.string().optional().nullable(),
  entry_price: z.union([z.number(), z.string()]).optional().nullable(),
  exit_price: z.union([z.number(), z.string()]).optional().nullable(),
  sl: z.union([z.number(), z.string()]).optional().nullable(),
  tp: z.union([z.number(), z.string()]).optional().nullable(),
  lot_size: z.union([z.number(), z.string()]).optional().nullable(),
  pnl: z.union([z.number(), z.string()]).optional().nullable(),
  rr_ratio: z.union([z.number(), z.string()]).optional().nullable(),
  screenshot_url: z.string().optional().nullable(),
  screenshots: z.array(z.any()).optional(),
  emotion: z.string().optional().nullable(),
  discipline_score: z.union([z.number(), z.string()]).optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
  linked_plan_id: z.string().optional().nullable(),
  account_id: z.string().optional().nullable(),
});

export const updateJournalSchema = createJournalSchema.partial().extend({
  admin_feedback: z.string().optional().nullable(),
});

export const createAccountSchema = z.object({
  name: z.string().min(1, { message: 'Tên tài khoản không được để trống' }),
  initial_balance: z.union([z.number(), z.string()]).refine((val: any) => Number(val) > 0, { message: 'Số dư ban đầu phải lớn hơn 0' }),
  prop_firm: z.string().optional().nullable(),
  phase: z.string().optional(),
  currency: z.string().optional(),
  max_daily_loss_pct: z.union([z.number(), z.string()]).optional(),
  max_total_drawdown_pct: z.union([z.number(), z.string()]).optional(),
  profit_target_pct: z.union([z.number(), z.string()]).optional().nullable(),
  color: z.string().optional(),
  logo_url: z.string().optional().nullable(),
  student_id: z.string().optional(),
});

export const updateAccountSchema = createAccountSchema.partial().extend({
  current_balance: z.union([z.number(), z.string()]).optional(),
  status: z.string().optional(),
});
