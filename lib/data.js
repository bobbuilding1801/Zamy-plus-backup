// ZAMY minimal test catalog — only 2 products for testing.
// Add/remove products via the admin panel later.

export const CATEGORIES = [
  { slug: 'electronics', name: 'Electronics', icon: 'Smartphone', subs: ['Smartphones','Laptops','Tablets','Smart Watches','Cameras','Audio Equipment','Gaming'] },
  { slug: 'computer-parts', name: 'Computer Parts', icon: 'Cpu', subs: ['CPUs','Motherboards','RAM','Graphics Cards','SSD','HDD','Power Supplies','Cabinets','Cooling Systems','Networking'] },
  { slug: 'automotive', name: 'Automotive', icon: 'Car', subs: ['Car Parts','Bike Parts','Batteries','Engine Oil','Tyres','Lighting','Accessories','Car Care','Tools'] },
  { slug: 'mobile-accessories', name: 'Mobile Accessories', icon: 'Headphones', subs: ['Chargers','Cables','Cases','Screen Protectors','Power Banks','Earbuds'] },
  { slug: 'electrical', name: 'Electrical', icon: 'Zap', subs: ['Wiring','Switches','Sockets','LED Lighting','Circuit Breakers'] },
  { slug: 'industrial', name: 'Industrial Equipment', icon: 'Factory', subs: ['Machinery','Safety Gear','Measuring','Fasteners','Bearings'] },
  { slug: 'home-electronics', name: 'Home Electronics', icon: 'Home', subs: ['TVs','Kitchen','Vacuums','Air Purifiers'] },
  { slug: 'office', name: 'Office Equipment', icon: 'Briefcase', subs: ['Printers','Monitors','Chairs','Shredders','UPS'] },
]

export const BRANDS = ['ZAMY','Samsung','Apple','ASUS','Sony','Bosch','DeWalt']

export const PRODUCTS = [
  {
    id: '0001',
    sku: 'ZMY-0001',
    name: 'Apex Pro 5G Smartphone 256GB',
    brand: 'Samsung',
    category: 'electronics',
    subcategory: 'Smartphones',
    price: 59999,
    mrp: 85999,
    rating: 4.6,
    ratingCount: 1240,
    stock: 25,
    discount: 30,
    freeShip: true,
    images: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=900',
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=900',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=900',
    ],
    tags: ['featured','bestseller','trending','new','toprated','deal'],
    description: 'Flagship 5G phone with AMOLED 120Hz display and pro-grade triple camera. Perfect for testing the ZAMY buying flow end-to-end.',
    specs: {
      Display: '6.7" AMOLED 120Hz',
      Chipset: 'Snapdragon 8 Gen 3',
      RAM: '12GB',
      Storage: '256GB',
      Battery: '5000 mAh',
      Camera: '50 + 12 + 10 MP',
    },
    createdAt: Date.now() - 3 * 86400000,
  },
  {
    id: '0002',
    sku: 'ZMY-0002',
    name: 'ZenBlade 14 OLED Laptop i7 / 16GB / 1TB',
    brand: 'ASUS',
    category: 'electronics',
    subcategory: 'Laptops',
    price: 114990,
    mrp: 149990,
    rating: 4.7,
    ratingCount: 862,
    stock: 12,
    discount: 23,
    freeShip: true,
    images: [
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900',
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=900',
      'https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=900',
    ],
    tags: ['featured','bestseller','trending','new','toprated','deal'],
    description: 'Ultralight OLED laptop with all-day battery. Great for creators, engineers and everyday productivity.',
    specs: {
      CPU: 'Intel Core i7-1360P',
      RAM: '16GB LPDDR5',
      Storage: '1TB NVMe',
      Display: '14" 2.8K OLED',
      Weight: '1.2 kg',
    },
    createdAt: Date.now() - 7 * 86400000,
  },
]

export const HERO_SLIDES = [
  {
    tag: 'Mega Tech Sale',
    title: 'Up to 60% OFF on Laptops & GPUs',
    subtitle: 'Powerful machines for creators, engineers and gamers.',
    cta: 'Shop Electronics',
    href: '/category/electronics',
    img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1600',
    accent: 'from-yellow-400 via-yellow-300 to-white',
  },
  {
    tag: 'Build Your Rig',
    title: 'Computer Parts, Priced to Build',
    subtitle: 'CPUs, GPUs, RAM, SSDs and more — from trusted brands.',
    cta: 'Explore PC Parts',
    href: '/category/computer-parts',
    img: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=1600',
    accent: 'from-yellow-500 via-yellow-300 to-black',
  },
  {
    tag: 'Garage Ready',
    title: 'Automotive & Tools You Can Trust',
    subtitle: 'Batteries, tyres, engine oils, power tools — genuine only.',
    cta: 'Shop Automotive',
    href: '/category/automotive',
    img: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=1600',
    accent: 'from-black via-neutral-800 to-yellow-500',
  },
]

export const PROMOS = [
  { title: 'Limited Time Flash Deals', sub: 'Ends in 24 hours. Grab them fast.', cta: 'View Deals', href: '/deals', img:'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1400' },
  { title: 'Everyday Essentials', sub: 'Cables, chargers, accessories under $999', cta: 'Shop Now', href: '/category/mobile-accessories', img:'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=1400' },
  { title: 'Pro Workshop', sub: 'Tools & industrial gear for professionals', cta: 'Shop Tools', href: '/category/industrial', img:'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=1400' },
]

export function findProduct(id) {
  return PRODUCTS.find(p => p.id === id)
}

export function filterProducts({ q='', category='', subcategory='', brand=[], minPrice=0, maxPrice=Infinity, rating=0, inStock=false, sort='popular', tag='' } = {}) {
  let list = PRODUCTS.slice()
  if (q) {
    const query = q.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(query) || p.brand.toLowerCase().includes(query) || p.subcategory.toLowerCase().includes(query) || p.category.toLowerCase().includes(query))
  }
  if (category) list = list.filter(p => p.category === category)
  if (subcategory) list = list.filter(p => p.subcategory.toLowerCase() === subcategory.toLowerCase())
  if (brand?.length) list = list.filter(p => brand.includes(p.brand))
  if (rating) list = list.filter(p => p.rating >= rating)
  if (inStock) list = list.filter(p => p.stock > 0)
  list = list.filter(p => p.price >= minPrice && p.price <= maxPrice)
  if (tag) list = list.filter(p => (p.tags||[]).includes(tag))
  switch (sort) {
    case 'price_asc': list.sort((a,b) => a.price - b.price); break
    case 'price_desc': list.sort((a,b) => b.price - a.price); break
    case 'rating': list.sort((a,b) => b.rating - a.rating); break
    case 'newest': list.sort((a,b) => b.createdAt - a.createdAt); break
    case 'discount': list.sort((a,b) => b.discount - a.discount); break
    default: list.sort((a,b) => b.ratingCount - a.ratingCount)
  }
  return list
}

export function suggestProducts(q, limit=8) {
  if (!q) return []
  return filterProducts({ q }).slice(0, limit)
}

export function similarProducts(product, limit=8) {
  if (!product) return []
  return PRODUCTS
    .filter(p => p.id !== product.id && (p.category === product.category || p.brand === product.brand))
    .sort((a,b) => (b.rating*b.ratingCount) - (a.rating*a.ratingCount))
    .slice(0, limit)
}
