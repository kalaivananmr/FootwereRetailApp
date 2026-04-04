export interface User { id: string; name: string; phone: string; role: 'owner'|'staff'|'accountant'; shop_id: string; }
export interface Shop { id: string; name: string; address: string; gst_number: string; phone: string; logo_data?: string; }
export interface Product { id: string; shop_id: string; brand_name: string; article_number: string; size: string; color: string; mrp: number; cost_price: number; quantity: number; low_stock_threshold: number; created_at: string; updated_at: string; }
export interface InvoiceItem { id: string; invoice_id: string; product_id: string; brand_name: string; article_number: string; size: string; color: string; quantity: number; mrp: number; selling_price: number; cost_price: number; total: number; }
export interface PaymentDetail { mode: string; amount: number; }
export interface Invoice { id: string; shop_id: string; invoice_number: string; date: string; customer_name: string; customer_phone: string; subtotal: number; discount: number; discount_type: string; gst_rate: number; gst_amount: number; final_amount: number; payment_mode: string; payment_details: PaymentDetail[]; status: string; items?: InvoiceItem[]; shop?: Shop; }
export interface CartRow { id: string; product_id: string; brand_name: string; article_number: string; size: string; color: string; quantity: number; mrp: number; selling_price: number; cost_price: number; }
export interface AnalyticsSummary { total_sales: number; total_cost: number; profit: number; margin_percent: number; invoice_count: number; total_items: number; total_discount: number; }
export interface TrendPoint { label: string; sales: number; profit: number; cost: number; }
export interface TopProduct { brand_name: string; article_number: string; color: string; sold: number; revenue: number; cost: number; profit: number; name: string; }
export interface BrandData { brand_name: string; revenue: number; sold: number; percent: number; }
export interface SizeData { size: string; sold: number; }
export interface PaymentData { payment_mode: string; count: number; total: number; percent: number; }
export interface StaffMember { id: string; name: string; phone: string; role: string; is_active: number; created_at: string; }
export type Period = 'today'|'week'|'month'|'90days';
