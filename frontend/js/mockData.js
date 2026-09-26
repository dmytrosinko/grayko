/**
 * GRAYKO Mock Data & Client-Side Store Fallback Engine
 * Enables fully functional store browsing, filtering, search, cart calculation,
 * order placement, and admin panel on static hosts like Netlify / GitHub Pages.
 */

export const INITIAL_SUPPLIERS = [
  {
    id: 1,
    name: "Центральний склад (Київ)",
    code: "CENTRAL_KYIV",
    warehouse_city: "Київ",
    warehouse_address: "вул. Алма-Атинська, 35а, Склад №7",
    feed_url: "https://distributor-b2b.ua/export/yml_feed.xml",
    feed_type: "YML",
    settlement_terms: "Депозитна система (поповнення від 1000 грн). Безкоштовне пакування від 1000 грн, інакше 15 грн.",
    deposit_balance: 8450.00,
    free_packing_threshold: 1000.0,
    packing_fee: 15.0
  },
  {
    id: 2,
    name: "Регіональний склад (Бердичів)",
    code: "PARTNER_REGIONAL",
    warehouse_city: "Бердичів",
    warehouse_address: "вул. Європейська, 14",
    feed_url: "https://distributor-b2b.ua/export/partner_feed.xml",
    feed_type: "XML",
    settlement_terms: "Відвантаження щодня о 16:00. Пакування 10 грн при замовленні до 800 грн.",
    deposit_balance: 3150.00,
    free_packing_threshold: 800.0,
    packing_fee: 10.0
  }
];

export const INITIAL_CATEGORIES = [
  { id: 1, parent_id: null, slug: "rc-and-vehicles", name_uk: "Машинки та радіокеровані моделі", icon: "🏎️", description_uk: "Машинки на радіокеруванні, треки, паркінги, гелікоптери, дрони та спецтехніка." },
  { id: 2, parent_id: null, slug: "dolls-and-soft-toys", name_uk: "Ляльки та м'які іграшки", icon: "🧸", description_uk: "Плюшеві іграшки, пупси, інтерактивні ляльки, будиночки та аксесуари." },
  { id: 3, parent_id: null, slug: "constructors-and-3d", name_uk: "Конструктори та 3D-пазли", icon: "⚙️", description_uk: "Механічні дерев'яні моделі, блочні конструктори, магнітні набори та LEGO-сумісні серії." },
  { id: 4, parent_id: null, slug: "wooden-and-montessori", name_uk: "Дерев'яні та Монтессорі іграшки", icon: "🪵", description_uk: "Екологічні дерев'яні сортери, бізіборди, пірамідки, вежі та балансири." },
  { id: 5, parent_id: null, slug: "stem-and-science", name_uk: "STEM, досліди та наука", icon: "🔬", description_uk: "Набори для хімічних і фізичних експериментів, робототехніка, мікроскопи та телескопи." },
  { id: 6, parent_id: null, slug: "board-games-and-puzzles", name_uk: "Настільні ігри та пазли", icon: "🎲", description_uk: "Стратегії, сімейні ігри, вікторини, класичні пазли та логічні головоломки." },
  { id: 7, parent_id: null, slug: "creativity-and-crafts", name_uk: "Творчість, ліплення та малювання", icon: "🎨", description_uk: "Кінетичний пісок, пластилін, картини за номерами, набори для гончарства та моделювання." },
  { id: 8, parent_id: null, slug: "roleplay-sets", name_uk: "Ігрові набори та професії", icon: "👨‍🍳", description_uk: "Дитячі кухні, супермаркети, набори лікаря, валізи з інструментами та дитяча косметика." },
  { id: 9, parent_id: null, slug: "baby-toys", name_uk: "Іграшки для малюків (0-12 міс.)", icon: "👶", description_uk: "Брязкальця, прорізувачі, музичні мобілі, розвиваючі килимки та дуги." },
  { id: 10, parent_id: null, slug: "outdoor-and-sports", name_uk: "Активні ігри та іграшки для вулиці", icon: "⚽", description_uk: "Самокати, м'ячі, бадмінтон, водні пістолети, намети та літні ігри." }
];

export const INITIAL_PRODUCTS = [
  {
    id: 1,
    supplier_id: 1,
    supplier_name: "Центральний склад (Київ)",
    supplier_city: "Київ",
    supplier_sku: "TY-RC-989",
    internal_sku: "GRAY-RC-001",
    slug: "rc-monster-truck-4wd-speed",
    title_uk: "Всюдихід-дрифт на радіокеруванні 4WD «Monster Stunt Climber»",
    description_uk: "Потужний повнопривідний позашляховик із роликовими колесами для бічного дрифту на 360°. Оснащений підсвіткою коліс, звуковими ефектами диму (парогенератор) та керуванням як від пульта 2.4 GHz, так і сенсорним браслетом на руку. Акумулятор 1200 mAh у комплекті.",
    brand: "Sulong Toys",
    category_id: 1,
    min_age: 6,
    max_age: 16,
    age_group: "6-8 років",
    material: "безпечний пластик, метал",
    parts_count: 4,
    assembly_time_mins: 0,
    difficulty_level: null,
    skills_developed: ["швидкість реакції", "координація рухів", "просторова орієнтація"],
    cost_price: 620.00,
    rrp_price: 999.00,
    price: 999.00,
    stock_quantity: 28,
    is_active: 1,
    is_featured: 1,
    is_new: 1,
    is_bestseller: 1,
    images: [
      "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
    ],
    specifications: {
      "Тип керування": "Пульт 2.4 GHz + Сенсорний браслет жестами",
      "Привід": "Повний 4WD",
      "Функція пари": "Вбудований парогенератор (холодна пара)",
      "Час роботи": "до 25-30 хвилин"
    }
  },
  {
    id: 2,
    supplier_id: 1,
    supplier_name: "Центральний склад (Київ)",
    supplier_city: "Київ",
    supplier_sku: "TY-TRK-707",
    internal_sku: "GRAY-TRK-002",
    slug: "hot-wheels-style-loop-track-parking",
    title_uk: "Багаторівневий автотрек-паркінг з мертвою петлею та 4 машинками",
    description_uk: "Захоплюючий гоночний комплекс із пусковою установкою, подвійною мертвою петлею на 360°, автоматичним ліфтом та звуковими ефектами. У наборі 4 металеві машинки масштабу 1:64.",
    brand: "Speed Pioneer",
    category_id: 1,
    min_age: 4,
    max_age: 10,
    age_group: "3-5 років",
    material: "безпечний пластик, метал",
    parts_count: 48,
    assembly_time_mins: 25,
    difficulty_level: null,
    skills_developed: ["дрібна моторика", "емоційний розвиток", "уява"],
    cost_price: 540.00,
    rrp_price: 880.00,
    price: 880.00,
    stock_quantity: 34,
    is_active: 1,
    is_featured: 1,
    is_new: 0,
    is_bestseller: 1,
    images: [
      "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80"
    ],
    specifications: {
      "Кількість поверхів": "3 рівні паркінгу",
      "Машинки у комплекті": "4 шт (литий метал)",
      "Довжина треку": "1.8 метра"
    }
  },
  {
    id: 3,
    supplier_id: 1,
    supplier_name: "Центральний склад (Київ)",
    supplier_sku: "TY-DOL-301",
    internal_sku: "GRAY-DOL-003",
    slug: "interactive-baby-doll-born-accessories",
    title_uk: "Інтерактивний пупс «Малятко» з ванночкою та 8 аксесуарами",
    description_uk: "Реалістичний пупс із м'якого вінілу. Вміє пити з пляшечки, ходити на горщик, закривати очі в положенні лежачи та плакати справжніми сльозами. У комплекті: ванночка, соска, пляшечка, памперс, горщик, тарілочка з ложечкою та костюмчик.",
    brand: "Warm Baby",
    category_id: 2,
    min_age: 3,
    max_age: 8,
    age_group: "3-5 років",
    material: "вініл, текстиль",
    parts_count: 9,
    assembly_time_mins: 0,
    difficulty_level: null,
    skills_developed: ["турбота та емпатія", "сюжетно-рольова гра", "соціальні навички"],
    cost_price: 490.00,
    rrp_price: 850.00,
    price: 850.00,
    stock_quantity: 20,
    is_active: 1,
    is_featured: 1,
    is_new: 1,
    is_bestseller: 1,
    images: [
      "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80"
    ],
    specifications: {
      "Зріст пупса": "42 см",
      "Матеріал": "Гіпоалергенний вініл Soft-Touch",
      "Функції": "П'є, пісяє, плаче сльозами, закриває очі"
    }
  },
  {
    id: 4,
    supplier_id: 1,
    supplier_name: "Центральний склад (Київ)",
    supplier_sku: "TY-SFT-881",
    internal_sku: "GRAY-SFT-004",
    slug: "plush-soft-corgi-pillow-giant",
    title_uk: "М'яка плюшева іграшка-обіймашка «Веселий Коргі» (60 см)",
    description_uk: "Надзвичайно м'який та приємний на дотик плюшевий песик-подушка. Наповнювач — гіпоалергенний холофайбер високої щільності, який не збивається після прання. Ідеально підходить для сну та обіймів.",
    brand: "Fancy Kids",
    category_id: 2,
    min_age: 1,
    max_age: 99,
    age_group: "1-3 роки",
    material: "текстиль, гіпоалергенний плюш",
    parts_count: 1,
    assembly_time_mins: 0,
    difficulty_level: null,
    skills_developed: ["емоційний комфорт", "тактильний розвиток"],
    cost_price: 310.00,
    rrp_price: 540.00,
    price: 540.00,
    stock_quantity: 40,
    is_active: 1,
    is_featured: 0,
    is_new: 0,
    is_bestseller: 1,
    images: [
      "https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=800&q=80"
    ],
    specifications: {
      "Довжина": "60 см",
      "Догляд": "Машинне прання при 30°C",
      "Матеріал верху": "Ультрам'який мікроплюш"
    }
  },
  {
    id: 5,
    supplier_id: 1,
    supplier_name: "Центральний склад (Київ)",
    supplier_sku: "UG-70044",
    internal_sku: "GRAY-UG-001",
    slug: "ugears-mechanical-locomotive",
    title_uk: "Механічний 3D-конструктор Ugears «Локомотив з тендером»",
    description_uk: "Культова модель механічного поїзда з гумомотором, поршнями та рухомими шестернями. Збирається без жодної краплі клею. Долає до 5 метрів на одному заводі двигуна.",
    brand: "Ugears",
    category_id: 3,
    min_age: 14,
    max_age: 99,
    age_group: "14+",
    material: "дерево",
    parts_count: 443,
    assembly_time_mins: 600,
    difficulty_level: "Складний",
    skills_developed: ["інженерне мислення", "дрібна моторика", "посидючість", "просторова уява"],
    cost_price: 1150.00,
    rrp_price: 1690.00,
    price: 1690.00,
    stock_quantity: 18,
    is_active: 1,
    is_featured: 1,
    is_new: 0,
    is_bestseller: 1,
    images: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
    ],
    specifications: {
      "Розмір моделі": "31.5 x 10 x 12.5 см",
      "Матеріал": "Березова фанера",
      "Кількість деталей": "443 шт"
    }
  },
  {
    id: 6,
    supplier_id: 2,
    supplier_name: "Регіональний склад (Бердичів)",
    supplier_city: "Бердичів",
    supplier_sku: "WT-80120",
    internal_sku: "GRAY-WT-002",
    slug: "wood-trick-space-station-mars",
    title_uk: "Дерев'яний 3D-конструктор Wood Trick «Марсохід Discovery Rover»",
    description_uk: "Деталізований планетохід з повнопривідною підвіскою, сонячними панелями та обертовими антенами. Працює на пружинному приводі.",
    brand: "Wood Trick",
    category_id: 3,
    min_age: 12,
    max_age: 99,
    age_group: "9-12 років",
    material: "дерево",
    parts_count: 312,
    assembly_time_mins: 360,
    difficulty_level: "Середній",
    skills_developed: ["STEM / фізика", "просторове мислення", "логіка"],
    cost_price: 790.00,
    rrp_price: 1250.00,
    price: 1250.00,
    stock_quantity: 25,
    is_active: 1,
    is_featured: 1,
    is_new: 1,
    is_bestseller: 1,
    images: [
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80"
    ],
    specifications: {
      "Розмір моделі": "24 x 15 x 14 см",
      "Матеріал": "Шліфована фанера",
      "Кількість деталей": "312 шт"
    }
  },
  {
    id: 7,
    supplier_id: 1,
    supplier_name: "Центральний склад (Київ)",
    supplier_sku: "TY-99116-01",
    internal_sku: "GRAY-CBK-003",
    slug: "cubika-wooden-town-blocks",
    title_uk: "Дерев'яний розвиваючий набір Cubika «Еко-Містечко 55 деталей»",
    description_uk: "Класичний конструктор з екологічно чистого карпатського бука. Покритий німецькими фарбами на водній основі без запаху та токсинів. Допомагає вивчати кольори та форми.",
    brand: "Cubika",
    category_id: 4,
    min_age: 1,
    max_age: 4,
    age_group: "1-3 роки",
    material: "дерево",
    parts_count: 55,
    assembly_time_mins: 30,
    difficulty_level: "Легкий",
    skills_developed: ["дрібна моторика", "вивчення кольорів", "координація"],
    cost_price: 280.00,
    rrp_price: 499.00,
    price: 499.00,
    stock_quantity: 42,
    is_active: 1,
    is_featured: 1,
    is_new: 0,
    is_bestseller: 1,
    images: [
      "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80"
    ],
    specifications: {
      "Матеріал": "Карпатський бук, ясен",
      "Сертифікація": "EN-71 Європейський стандарт"
    }
  },
  {
    id: 8,
    supplier_id: 1,
    supplier_name: "Центральний склад (Київ)",
    supplier_sku: "TY-4M-03291",
    internal_sku: "GRAY-4M-005",
    slug: "4m-kidzlabs-hydraulic-robotic-arm",
    title_uk: "Науково-дослідний STEM-набір 4M «Гідравлічна рука-маніпулятор»",
    description_uk: "Ніяких батарейок! Роботизована рука працює на законах гідравліки Паскаля: тиск води приводить у рух суглоби та клешню, здатну піднімати предмети.",
    brand: "4M",
    category_id: 5,
    min_age: 8,
    max_age: 14,
    age_group: "6-8 років",
    material: "безпечний пластик",
    parts_count: 86,
    assembly_time_mins: 120,
    difficulty_level: "Середній",
    skills_developed: ["STEM / гідравліка", "інженерне мислення", "логіка"],
    cost_price: 460.00,
    rrp_price: 790.00,
    price: 790.00,
    stock_quantity: 22,
    is_active: 1,
    is_featured: 1,
    is_new: 0,
    is_bestseller: 1,
    images: [
      "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80"
    ],
    specifications: {
      "Тип приводу": "Гідравлічний (вода)",
      "Кількість осей": "3 ступені свободи"
    }
  },
  {
    id: 9,
    supplier_id: 1,
    supplier_name: "Центральний склад (Київ)",
    supplier_sku: "TY-SG-5021",
    internal_sku: "GRAY-SMG-007",
    slug: "smart-games-iq-puzzler-pro",
    title_uk: "Логічна гра-головоломка Smart Games «IQ Профі (120 завдань)»",
    description_uk: "Компактна магнітно-механічна 2D та 3D головоломка для тренування просторового інтелекту. 120 завдань у 5 рівнях складності.",
    brand: "Smart Games",
    category_id: 6,
    min_age: 6,
    max_age: 99,
    age_group: "6-8 років",
    material: "безпечний пластик",
    parts_count: 12,
    assembly_time_mins: 20,
    difficulty_level: "Середній",
    skills_developed: ["просторове мислення", "логічний аналіз"],
    cost_price: 270.00,
    rrp_price: 475.00,
    price: 475.00,
    stock_quantity: 35,
    is_active: 1,
    is_featured: 1,
    is_new: 0,
    is_bestseller: 1,
    images: [
      "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80"
    ],
    specifications: {
      "Кількість завдань": "120 завдань",
      "Формат": "Дорожній компактний кейс"
    }
  },
  {
    id: 10,
    supplier_id: 1,
    supplier_name: "Центральний склад (Київ)",
    supplier_sku: "TY-KNT-200",
    internal_sku: "GRAY-KNT-008",
    slug: "kinetic-sand-magic-castle-set",
    title_uk: "Набір кінетичного піску «Чарівний Замок» (1.5 кг + пісочниця та 8 формочок)",
    description_uk: "Оригінальний кінетичний пісок 3 яскравих кольорів. Не липне до рук, не висихає, приємно пересипається та тримає форму замкових башт. У комплекті складна надувна пісочниця.",
    brand: "Kidz Sand",
    category_id: 7,
    min_age: 3,
    max_age: 10,
    age_group: "3-5 років",
    material: "натуральний кварцовий пісок, безпечний полімер",
    parts_count: 10,
    assembly_time_mins: 0,
    difficulty_level: null,
    skills_developed: ["сенсорний розвиток", "творчість", "дрібна моторика"],
    cost_price: 220.00,
    rrp_price: 390.00,
    price: 390.00,
    stock_quantity: 50,
    is_active: 1,
    is_featured: 0,
    is_new: 1,
    is_bestseller: 1,
    images: [
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80"
    ],
    specifications: {
      "Вага піску": "1.5 кг (3 кольори по 500г)",
      "Формочки": "8 пластикових формочок замку"
    }
  },
  {
    id: 11,
    supplier_id: 1,
    supplier_name: "Центральний склад (Київ)",
    supplier_sku: "TY-KIT-990",
    internal_sku: "GRAY-KIT-009",
    slug: "interactive-kids-kitchen-sound-light-water",
    title_uk: "Дитяча інтерактивна кухня «Chef Master» зі справжньою водою та парою",
    description_uk: "Велика сюжетна кухня зі звуками смаження, підсвіткою конфорок, холодною парою та помповим краном, з якого циркулює справжня вода. У комплекті 38 аксесуарів (посуд, продукти, що змінюють колір при варінні).",
    brand: "BeChef",
    category_id: 8,
    min_age: 3,
    max_age: 8,
    age_group: "3-5 років",
    material: "безпечний пластик",
    parts_count: 38,
    assembly_time_mins: 20,
    difficulty_level: null,
    skills_developed: ["сюжетна гра", "соціальні навички", "уява"],
    cost_price: 790.00,
    rrp_price: 1390.00,
    price: 1390.00,
    stock_quantity: 16,
    is_active: 1,
    is_featured: 1,
    is_new: 1,
    is_bestseller: 1,
    images: [
      "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80"
    ],
    specifications: {
      "Висота кухні": "72 см",
      "Кількість предметів": "38 аксесуарів",
      "Ефекти": "Справжня вода з крана, пара, звук кипіння"
    }
  },
  {
    id: 12,
    supplier_id: 1,
    supplier_name: "Центральний склад (Київ)",
    supplier_sku: "TY-BTT-0914",
    internal_sku: "GRAY-BAT-010",
    slug: "battat-sensory-textured-blocks",
    title_uk: "Сенсорні м'які кубики Battat «Порахуй і склади» (10 шт)",
    description_uk: "10 м'яких тактильних кубиків із безпечного матеріалу без BPA. На кожній грані витиснені цифри, тварини та візерунки. Можна стискати, гризти та брати у ванну.",
    brand: "Battat",
    category_id: 9,
    min_age: 0,
    max_age: 3,
    age_group: "0-1 рік",
    material: "текстиль, силікон",
    parts_count: 10,
    assembly_time_mins: 0,
    difficulty_level: null,
    skills_developed: ["сенсорний розвиток", "тактильні відчуття", "дрібна моторика"],
    cost_price: 480.00,
    rrp_price: 820.00,
    price: 820.00,
    stock_quantity: 19,
    is_active: 1,
    is_featured: 1,
    is_new: 0,
    is_bestseller: 1,
    images: [
      "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80"
    ],
    specifications: {
      "Матеріал": "М'який харчовий полімер",
      "Кількість": "10 кубиків"
    }
  },
  {
    id: 13,
    supplier_id: 1,
    supplier_name: "Центральний склад (Київ)",
    supplier_sku: "TY-SCT-404",
    internal_sku: "GRAY-SCT-011",
    slug: "scooter-maxi-led-wheels-foldable",
    title_uk: "Дитячий самокат 3-колісний Maxi з LED колесами, що світяться",
    description_uk: "Надійний стійкий триколісний самокат з алюмінієвим кермом, що регулюється по висоті під зріст дитини (65-85 см). Поліуретанові безшумні колеса з підшипниками ABEC-7 яскраво світяться під час руху без батарейок.",
    brand: "Scooter Maxi",
    category_id: 10,
    min_age: 3,
    max_age: 9,
    age_group: "3-5 років",
    material: "алюміній, поліуретан, посилений пластик",
    parts_count: 1,
    assembly_time_mins: 0,
    difficulty_level: null,
    skills_developed: ["баланс і координація", "фізичний розвиток", "витривалість"],
    cost_price: 580.00,
    rrp_price: 990.00,
    price: 990.00,
    stock_quantity: 25,
    is_active: 1,
    is_featured: 1,
    is_new: 1,
    is_bestseller: 1,
    images: [
      "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80"
    ],
    specifications: {
      "Максимальне навантаження": "до 60 кг",
      "Колеса": "Поліуретан PU з LED підсвіткою",
      "Регулювання керма": "3 положення висоти"
    }
  }
];

export const CITIES_DATA = [
  {
    ref: "8d5a980d-391c-11dd-90d9-001a92567626",
    name: "Київ",
    region: "Київська область",
    warehouses: [
      { ref: "wh-kyiv-1", name: "Відділення №1: вул. Пирогівський шлях, 135", type: "Branch", max_weight: 1100 },
      { ref: "wh-kyiv-14", name: "Відділення №14: вул. Миколи Василенка, 2", type: "Branch", max_weight: 30 },
      { ref: "wh-kyiv-35", name: "Відділення №35: вул. Алма-Атинська, 39А", type: "Branch", max_weight: 30 },
      { ref: "wh-kyiv-55", name: "Відділення №55: просп. Перемоги (Берестейський), 67", type: "Branch", max_weight: 30 },
      { ref: "wh-kyiv-102", name: "Поштомат №4510: вул. Хрещатик, 24", type: "Postomat", max_weight: 20 },
      { ref: "wh-kyiv-103", name: "Поштомат №8821: просп. Оболонський, 1Б (ТРЦ Dream)", type: "Postomat", max_weight: 20 }
    ]
  },
  {
    ref: "db5c88f5-391c-11dd-90d9-001a92567626",
    name: "Львів",
    region: "Львівська область",
    warehouses: [
      { ref: "wh-lviv-1", name: "Відділення №1: вул. Городоцька, 355/6", type: "Branch", max_weight: 1100 },
      { ref: "wh-lviv-4", name: "Відділення №4: вул. Угорська, 22", type: "Branch", max_weight: 30 },
      { ref: "wh-lviv-11", name: "Відділення №11: вул. Зелена, 147", type: "Branch", max_weight: 30 },
      { ref: "wh-lviv-101", name: "Поштомат №5230: площа Ринок, 10", type: "Postomat", max_weight: 20 }
    ]
  },
  {
    ref: "db5c88e0-391c-11dd-90d9-001a92567626",
    name: "Дніпро",
    region: "Дніпропетровська область",
    warehouses: [
      { ref: "wh-dnipro-1", name: "Відділення №1: вул. Маршала Малиновського, 114", type: "Branch", max_weight: 1100 },
      { ref: "wh-dnipro-12", name: "Відділення №12: просп. Дмитра Яворницького, 41", type: "Branch", max_weight: 30 },
      { ref: "wh-dnipro-101", name: "Поштомат №6104: вул. Короленка, 3", type: "Postomat", max_weight: 20 }
    ]
  },
  {
    ref: "db5c88d0-391c-11dd-90d9-001a92567626",
    name: "Одеса",
    region: "Одеська область",
    warehouses: [
      { ref: "wh-odesa-1", name: "Відділення №1: вул. Київське шосе, 27", type: "Branch", max_weight: 1100 },
      { ref: "wh-odesa-8", name: "Відділення №8: вул. Розумовська, 29", type: "Branch", max_weight: 30 },
      { ref: "wh-odesa-101", name: "Поштомат №3190: вул. Дерибасівська, 14", type: "Postomat", max_weight: 20 }
    ]
  },
  {
    ref: "db5c88c0-391c-11dd-90d9-001a92567626",
    name: "Харків",
    region: "Харківська область",
    warehouses: [
      { ref: "wh-kharkiv-1", name: "Відділення №1: просп. Гагаріна, 201-Б", type: "Branch", max_weight: 1100 },
      { ref: "wh-kharkiv-25", name: "Відділення №25: просп. Науки, 38", type: "Branch", max_weight: 30 }
    ]
  },
  {
    ref: "db5c88a1-391c-11dd-90d9-001a92567626",
    name: "Вінниця",
    region: "Вінницька область",
    warehouses: [
      { ref: "wh-vin-1", name: "Відділення №1: вул. Якова Шепеля, 1", type: "Branch", max_weight: 1100 },
      { ref: "wh-vin-5", name: "Відділення №5: вул. Соборна, 89", type: "Branch", max_weight: 30 }
    ]
  },
  {
    ref: "db5c88a2-391c-11dd-90d9-001a92567626",
    name: "Івано-Франківськ",
    region: "Івано-Франківська область",
    warehouses: [
      { ref: "wh-if-1", name: "Відділення №1: вул. Польова, 8", type: "Branch", max_weight: 1100 },
      { ref: "wh-if-4", name: "Відділення №4: вул. Незалежності, 97", type: "Branch", max_weight: 30 }
    ]
  }
];

// Helper to generate authentic 14-digit Nova Poshta TTN
export function generateTTN() {
  const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
  return `2045${digits}`;
}
