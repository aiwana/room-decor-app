/**
 * src/data/mockData.ts
 * Du lieu tam (mock) cho man Home.
 * Backend Spring Boot RESTful API chua implement -> dung mock,
 * ve sau thay bang Axios GET /api/products, /api/projects.
 */
import type { Product, Project, QuickAction } from '../types';

/** Ho tro tao URL anh placeholder that nhanh khi dev (picsum.photos) */
const ph = (seed: string, w: number, h: number): string =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

/** 4 Quick Actions - giu layout Hypic, doi nghiep vu sang VLXD */
export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-1', label: 'Mô phỏng AI', iconName: 'camera', routeName: 'Simulate' },
  { id: 'qa-2', label: 'Catalog Gạch', iconName: 'grid', routeName: 'Catalog' },
  { id: 'qa-3', label: 'Báo giá', iconName: 'document-text', routeName: 'Quote' },
  { id: 'qa-4', label: 'Tồn kho', iconName: 'cube', routeName: 'Stock' },
];

/** 8 san pham VLXD thuc te - "Vat lieu xu huong" */
export const TRENDING_PRODUCTS: Product[] = [
  {
    id: 'prd-01',
    name: 'Gạch men bóng kiếng 60x60 vân đá',
    brand: 'Đồng Tâm',
    price: 285000,
    unit: 'm2',
    category: 'Gạch ốp lát',
    imageUrl: ph('gach-dongtam-6060', 280, 350),
  },
  {
    id: 'prd-02',
    name: 'Gạch Granite bóng kiếng 80x80 kem vàng',
    brand: 'Prime',
    price: 420000,
    unit: 'm2',
    category: 'Gạch ốp lát',
    imageUrl: ph('gach-prime-8080', 280, 350),
  },
  {
    id: 'prd-03',
    name: 'Sơn nội thất Dulux EasyClean bóng mờ',
    brand: 'Dulux',
    price: 1180000,
    unit: 'thùng',
    category: 'Sơn nước',
    imageUrl: ph('son-dulux-easyclean', 280, 350),
  },
  {
    id: 'prd-04',
    name: 'Xi măng PCB40 INSEE đa dụng 50kg',
    brand: 'INSEE',
    price: 98000,
    unit: 'bao',
    category: 'Xi măng',
    imageUrl: ph('ximang-insee-40', 280, 350),
  },
  {
    id: 'prd-05',
    name: 'Gạch giả gỗ 15x60 opsàn cao cấp',
    brand: 'VICOSTONE',
    price: 315000,
    unit: 'm2',
    category: 'Gạch ốp lát',
    imageUrl: ph('gach-giago-1560', 280, 350),
  },
  {
    id: 'prd-06',
    name: 'Sơn ngoại thất Jotun Jotashield bền màu',
    brand: 'Jotun',
    price: 1650000,
    unit: 'thùng',
    category: 'Sơn nước',
    imageUrl: ph('son-jotun-ngoai-that', 280, 350),
  },
  {
    id: 'prd-07',
    name: 'Keo dán gạch Weber tai Flex 25kg',
    brand: 'Weber',
    price: 245000,
    unit: 'bao',
    category: 'Keo & Phụ gia',
    imageUrl: ph('keo-dan-gach-weber', 280, 350),
  },
  {
    id: 'prd-08',
    name: 'Gạch mosaic kính trang trí 300x300',
    brand: 'Catalan',
    price: 520000,
    unit: 'm2',
    category: 'Gạch trang trí',
    imageUrl: ph('gach-mosaic-kinh', 280, 350),
  },
];

/** 6 du an tieu bieu - "Du an tien bieu" */
export const REFERENCE_PROJECTS: Project[] = [
  {
    id: 'prj-01',
    name: 'Bi thự Vinhome Ocean Park',
    location: 'Gia Lâm, Hà Nội',
    area: '250 m2 gạch + sơn',
    imageUrl: ph('du-an-vinhome-ocean', 400, 300),
  },
  {
    id: 'prj-02',
    name: 'Căn hộ Masteri Thảo Điền',
    location: 'TP. Thủ Đức, HCM',
    area: '86 m2 ốp lát',
    imageUrl: ph('du-an-masteri', 400, 300),
  },
  {
    id: 'prj-03',
    name: 'Quán cà phê The Morning',
    location: 'Quận 3, HCM',
    area: '120 m2 gạch giả gỗ',
    imageUrl: ph('du-an-cafe', 400, 300),
  },
  {
    id: 'prj-04',
    name: 'Nhà phố Green Valley',
    location: 'Quận 7, HCM',
    area: '180 m2 tổng thể',
    imageUrl: ph('du-an-nhapho', 400, 300),
  },
  {
    id: 'prj-05',
    name: 'Khách sạn Sea Pearl Hạ Long',
    location: 'Hạ Long, Quảng Ninh',
    area: '1.200 m2 granite',
    imageUrl: ph('du-an-khachsank', 400, 300),
  },
  {
    id: 'prj-06',
    name: 'Villa Emerald Đà Lạt',
    location: 'Đà Lạt, Lâm Đồng',
    area: '300 m2 ngoại thất',
    imageUrl: ph('du-an-villa-dalat', 400, 300),
  },
];

/** Gia lap goi API: tra mock data sau 300ms (giống delay mang) */
export const fetchHomeData = (): Promise<{
  products: Product[];
  projects: Project[];
}> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({ products: TRENDING_PRODUCTS, projects: REFERENCE_PROJECTS });
    }, 300);
  });
