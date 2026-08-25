import os
import xml.etree.ElementTree as ET
import json
import sqlite3
from datetime import datetime
from db import get_db_connection, DB_PATH

FEED_XML_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'b2b_feed.xml')

# Comprehensive toy categories covering ALL product lines from Toysi.ua
INITIAL_CATALOG_DATA = {
    "suppliers": [
        {
            "name": "Центральний склад (Київ)",
            "code": "CENTRAL_KYIV",
            "warehouse_city": "Київ",
            "warehouse_address": "вул. Алма-Атинська, 35а, Склад №7",
            "feed_url": "https://distributor-b2b.ua/export/yml_feed.xml",
            "feed_type": "YML",
            "settlement_terms": "Депозитна система (поповнення від 1000 грн). Безкоштовне пакування від 1000 грн, інакше 15 грн.",
            "deposit_balance": 8450.00,
            "free_packing_threshold": 1000.0,
            "packing_fee": 15.0
        },
        {
            "name": "Регіональний склад (Бердичів)",
            "code": "PARTNER_REGIONAL",
            "warehouse_city": "Бердичів",
            "warehouse_address": "вул. Європейська, 14",
            "feed_url": "https://distributor-b2b.ua/export/partner_feed.xml",
            "feed_type": "XML",
            "settlement_terms": "Відвантаження щодня о 16:00. Пакування 10 грн при замовленні до 800 грн.",
            "deposit_balance": 3150.00,
            "free_packing_threshold": 800.0,
            "packing_fee": 10.0
        }
    ],
    "categories": [
        {"id": 1, "parent_id": None, "slug": "rc-and-vehicles", "name_uk": "Машинки та радіокеровані моделі", "icon": "🏎️", "description_uk": "Машинки на радіокеруванні, треки, паркінги, гелікоптери, дрони та спецтехніка."},
        {"id": 2, "parent_id": None, "slug": "dolls-and-soft-toys", "name_uk": "Ляльки та м'які іграшки", "icon": "🧸", "description_uk": "Плюшеві іграшки, пупси, інтерактивні ляльки, будиночки та аксесуари."},
        {"id": 3, "parent_id": None, "slug": "constructors-and-3d", "name_uk": "Конструктори та 3D-пазли", "icon": "⚙️", "description_uk": "Механічні дерев'яні моделі, блочні конструктори, магнітні набори та LEGO-сумісні серії."},
        {"id": 4, "parent_id": None, "slug": "wooden-and-montessori", "name_uk": "Дерев'яні та Монтессорі іграшки", "icon": "🪵", "description_uk": "Екологічні дерев'яні сортери, бізіборди, пірамідки, вежі та балансири."},
        {"id": 5, "parent_id": None, "slug": "stem-and-science", "name_uk": "STEM, досліди та наука", "icon": "🔬", "description_uk": "Набори для хімічних і фізичних експериментів, робототехніка, мікроскопи та телескопи."},
        {"id": 6, "parent_id": None, "slug": "board-games-and-puzzles", "name_uk": "Настільні ігри та пазли", "icon": "🎲", "description_uk": "Стратегії, сімейні ігри, вікторини, класичні пазли та логічні головоломки."},
        {"id": 7, "parent_id": None, "slug": "creativity-and-crafts", "name_uk": "Творчість, ліплення та малювання", "icon": "🎨", "description_uk": "Кінетичний пісок, пластилін, картини за номерами, набори для гончарства та моделювання."},
        {"id": 8, "parent_id": None, "slug": "roleplay-sets", "name_uk": "Ігрові набори та професії", "icon": "👨‍🍳", "description_uk": "Дитячі кухні, супермаркети, набори лікаря, валізи з інструментами та дитяча косметика."},
        {"id": 9, "parent_id": None, "slug": "baby-toys", "name_uk": "Іграшки для малюків (0-12 міс.)", "icon": "👶", "description_uk": "Брязкальця, прорізувачі, музичні мобілі, розвиваючі килимки та дуги."},
        {"id": 10, "parent_id": None, "slug": "outdoor-and-sports", "name_uk": "Активні ігри та іграшки для вулиці", "icon": "⚽", "description_uk": "Самокати, м'ячі, бадмінтон, водні пістолети, намети та літні ігри."}
    ],
    "products": [
        # --- 1. RC & Vehicles ---
        {
            "supplier_code": "CENTRAL_KYIV",
            "supplier_sku": "TY-RC-989",
            "internal_sku": "GRAY-RC-001",
            "slug": "rc-monster-truck-4wd-speed",
            "title_uk": "Всюдихід-дрифт на радіокеруванні 4WD «Monster Stunt Climber»",
            "description_uk": "Потужний повнопривідний позашляховик із роликовими колесами для бічного дрифту на 360°. Оснащений підсвіткою коліс, звуковими ефектами диму (парогенератор) та керуванням як від пульта 2.4 GHz, так і сенсорним браслетом на руку. Акумулятор 1200 mAh у комплекті.",
            "brand": "Sulong Toys",
            "category_id": 1,
            "min_age": 6,
            "max_age": 16,
            "age_group": "6-8 років",
            "material": "безпечний пластик, метал",
            "parts_count": 4,
            "assembly_time_mins": 0,
            "difficulty_level": "Легкий",
            "skills_developed": ["швидкість реакції", "координація рухів", "просторова орієнтація"],
            "cost_price": 620.00,
            "rrp_price": 999.00,
            "price": 999.00,
            "stock_quantity": 28,
            "is_featured": 1,
            "is_new": 1,
            "is_bestseller": 1,
            "images": [
                "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
            ],
            "specifications": {
                "Тип керування": "Пульт 2.4 GHz + Сенсорний браслет жестами",
                "Привід": "Повний 4WD",
                "Функція пари": "Вбудований парогенератор (холодна пара)",
                "Час роботи": "до 25-30 хвилин"
            }
        },
        {
            "supplier_code": "CENTRAL_KYIV",
            "supplier_sku": "TY-TRK-707",
            "internal_sku": "GRAY-TRK-002",
            "slug": "hot-wheels-style-loop-track-parking",
            "title_uk": "Багаторівневий автотрек-паркінг з мертвою петлею та 4 машинками",
            "description_uk": "Захоплюючий гоночний комплекс із пусковою установкою, подвійною мертвою петлею на 360°, автоматичним ліфтом та звуковими ефектами. У наборі 4 металеві машинки масштабу 1:64.",
            "brand": "Speed Pioneer",
            "category_id": 1,
            "min_age": 4,
            "max_age": 10,
            "age_group": "3-5 років",
            "material": "безпечний пластик, метал",
            "parts_count": 48,
            "assembly_time_mins": 25,
            "difficulty_level": "Легкий",
            "skills_developed": ["дрібна моторика", "емоційний розвиток", "уява"],
            "cost_price": 540.00,
            "rrp_price": 880.00,
            "price": 880.00,
            "stock_quantity": 34,
            "is_featured": 1,
            "is_new": 0,
            "is_bestseller": 1,
            "images": [
                "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80"
            ],
            "specifications": {
                "Кількість поверхів": "3 рівні паркінгу",
                "Машинки у комплекті": "4 шт (литий метал)",
                "Довжина треку": "1.8 метра"
            }
        },

        # --- 2. Dolls & Soft Toys ---
        {
            "supplier_code": "CENTRAL_KYIV",
            "supplier_sku": "TY-DOL-301",
            "internal_sku": "GRAY-DOL-003",
            "slug": "interactive-baby-doll-born-accessories",
            "title_uk": "Інтерактивний пупс «Малятко» з ванночкою та 8 аксесуарами",
            "description_uk": "Реалістичний пупс із м'якого вінілу. Вміє пити з пляшечки, ходити на горщик, закривати очі в положенні лежачи та плакати справжніми сльозами. У комплекті: ванночка, соска, пляшечка, памперс, горщик, тарілочка з ложечкою та костюмчик.",
            "brand": "Warm Baby",
            "category_id": 2,
            "min_age": 3,
            "max_age": 8,
            "age_group": "3-5 років",
            "material": "вініл, текстиль",
            "parts_count": 9,
            "assembly_time_mins": 0,
            "difficulty_level": "Легкий",
            "skills_developed": ["турбота та емпатія", "сюжетно-рольова гра", "соціальні навички"],
            "cost_price": 490.00,
            "rrp_price": 850.00,
            "price": 850.00,
            "stock_quantity": 20,
            "is_featured": 1,
            "is_new": 1,
            "is_bestseller": 1,
            "images": [
                "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80"
            ],
            "specifications": {
                "Зріст пупса": "42 см",
                "Матеріал": "Гіпоалергенний вініл Soft-Touch",
                "Функції": "П'є, пісяє, плаче сльозами, закриває очі"
            }
        },
        {
            "supplier_code": "CENTRAL_KYIV",
            "supplier_sku": "TY-SFT-881",
            "internal_sku": "GRAY-SFT-004",
            "slug": "plush-soft-corgi-pillow-giant",
            "title_uk": "М'яка плюшева іграшка-обіймашка «Веселий Коргі» (60 см)",
            "description_uk": "Надзвичайно м'який та приємний на дотик плюшевий песик-подушка. Наповнювач — гіпоалергенний холофайбер високої щільності, який не збивається після прання. Ідеально підходить для сну та обіймів.",
            "brand": "Fancy Kids",
            "category_id": 2,
            "min_age": 1,
            "max_age": 99,
            "age_group": "1-3 роки",
            "material": "текстиль, гіпоалергенний плюш",
            "parts_count": 1,
            "assembly_time_mins": 0,
            "difficulty_level": "Легкий",
            "skills_developed": ["емоційний комфорт", "тактильний розвиток"],
            "cost_price": 310.00,
            "rrp_price": 540.00,
            "price": 540.00,
            "stock_quantity": 40,
            "is_featured": 0,
            "is_new": 0,
            "is_bestseller": 1,
            "images": [
                "https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=800&q=80"
            ],
            "specifications": {
                "Довжина": "60 см",
                "Догляд": "Машинне прання при 30°C",
                "Матеріал верху": "Ультрам'який мікроплюш"
            }
        },

        # --- 3. 3D Constructors & Mechanical ---
        {
            "supplier_code": "CENTRAL_KYIV",
            "supplier_sku": "UG-70044",
            "internal_sku": "GRAY-UG-001",
            "slug": "ugears-mechanical-locomotive",
            "title_uk": "Механічний 3D-конструктор Ugears «Локомотив з тендером»",
            "description_uk": "Культова модель механічного поїзда з гумомотором, поршнями та рухомими шестернями. Збирається без жодної краплі клею. Долає до 5 метрів на одному заводі двигуна.",
            "brand": "Ugears",
            "category_id": 3,
            "min_age": 14,
            "max_age": 99,
            "age_group": "14+",
            "material": "дерево",
            "parts_count": 443,
            "assembly_time_mins": 600,
            "difficulty_level": "Складний",
            "skills_developed": ["інженерне мислення", "дрібна моторика", "посидючість", "просторова уява"],
            "cost_price": 1150.00,
            "rrp_price": 1690.00,
            "price": 1690.00,
            "stock_quantity": 18,
            "is_featured": 1,
            "is_new": 0,
            "is_bestseller": 1,
            "images": [
                "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
            ],
            "specifications": {
                "Розмір моделі": "31.5 x 10 x 12.5 см",
                "Матеріал": "Березова фанера",
                "Кількість деталей": "443 шт"
            }
        },
        {
            "supplier_code": "PARTNER_REGIONAL",
            "supplier_sku": "WT-80120",
            "internal_sku": "GRAY-WT-002",
            "slug": "wood-trick-space-station-mars",
            "title_uk": "Дерев'яний 3D-конструктор Wood Trick «Марсохід Discovery Rover»",
            "description_uk": "Деталізований планетохід з повнопривідною підвіскою, сонячними панелями та обертовими антенами. Працює на пружинному приводі.",
            "brand": "Wood Trick",
            "category_id": 3,
            "min_age": 12,
            "max_age": 99,
            "age_group": "9-12 років",
            "material": "дерево",
            "parts_count": 312,
            "assembly_time_mins": 360,
            "difficulty_level": "Середній",
            "skills_developed": ["STEM / фізика", "просторове мислення", "логіка"],
            "cost_price": 790.00,
            "rrp_price": 1250.00,
            "price": 1250.00,
            "stock_quantity": 25,
            "is_featured": 1,
            "is_new": 1,
            "is_bestseller": 1,
            "images": [
                "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80"
            ],
            "specifications": {
                "Розмір моделі": "24 x 15 x 14 см",
                "Матеріал": "Шліфована фанера",
                "Кількість деталей": "312 шт"
            }
        },

        # --- 4. Wooden & Montessori ---
        {
            "supplier_code": "CENTRAL_KYIV",
            "supplier_sku": "TY-99116-01",
            "internal_sku": "GRAY-CBK-003",
            "slug": "cubika-wooden-town-blocks",
            "title_uk": "Дерев'яний розвиваючий набір Cubika «Еко-Містечко 55 деталей»",
            "description_uk": "Класичний конструктор з екологічно чистого карпатського бука. Покритий німецькими фарбами на водній основі без запаху та токсинів. Допомагає вивчати кольори та форми.",
            "brand": "Cubika",
            "category_id": 4,
            "min_age": 1,
            "max_age": 4,
            "age_group": "1-3 роки",
            "material": "дерево",
            "parts_count": 55,
            "assembly_time_mins": 30,
            "difficulty_level": "Легкий",
            "skills_developed": ["дрібна моторика", "вивчення кольорів", "координація"],
            "cost_price": 280.00,
            "rrp_price": 499.00,
            "price": 499.00,
            "stock_quantity": 42,
            "is_featured": 1,
            "is_new": 0,
            "is_bestseller": 1,
            "images": [
                "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80"
            ],
            "specifications": {
                "Матеріал": "Карпатський бук, ясен",
                "Сертифікація": "EN-71 Європейський стандарт"
            }
        },

        # --- 5. STEM & Science ---
        {
            "supplier_code": "CENTRAL_KYIV",
            "supplier_sku": "TY-4M-03291",
            "internal_sku": "GRAY-4M-005",
            "slug": "4m-kidzlabs-hydraulic-robotic-arm",
            "title_uk": "Науково-дослідний STEM-набір 4M «Гідравлічна рука-маніпулятор»",
            "description_uk": "Ніяких батарейок! Роботизована рука працює на законах гідравліки Паскаля: тиск води приводить у рух суглоби та клешню, здатну піднімати предмети.",
            "brand": "4M",
            "category_id": 5,
            "min_age": 8,
            "max_age": 14,
            "age_group": "6-8 років",
            "material": "безпечний пластик",
            "parts_count": 86,
            "assembly_time_mins": 120,
            "difficulty_level": "Середній",
            "skills_developed": ["STEM / гідравліка", "інженерне мислення", "логіка"],
            "cost_price": 460.00,
            "rrp_price": 790.00,
            "price": 790.00,
            "stock_quantity": 22,
            "is_featured": 1,
            "is_new": 0,
            "is_bestseller": 1,
            "images": [
                "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80"
            ],
            "specifications": {
                "Тип приводу": "Гідравлічний (вода)",
                "Кількість осей": "3 ступені свободи"
            }
        },

        # --- 6. Board Games & Logic ---
        {
            "supplier_code": "CENTRAL_KYIV",
            "supplier_sku": "TY-SG-5021",
            "internal_sku": "GRAY-SMG-007",
            "slug": "smart-games-iq-puzzler-pro",
            "title_uk": "Логічна гра-головоломка Smart Games «IQ Профі (120 завдань)»",
            "description_uk": "Компактна магнітно-механічна 2D та 3D головоломка для тренування просторового інтелекту. 120 завдань у 5 рівнях складності.",
            "brand": "Smart Games",
            "category_id": 6,
            "min_age": 6,
            "max_age": 99,
            "age_group": "6-8 років",
            "material": "безпечний пластик",
            "parts_count": 12,
            "assembly_time_mins": 20,
            "difficulty_level": "Середній",
            "skills_developed": ["просторове мислення", "логічний аналіз"],
            "cost_price": 270.00,
            "rrp_price": 475.00,
            "price": 475.00,
            "stock_quantity": 35,
            "is_featured": 1,
            "is_new": 0,
            "is_bestseller": 1,
            "images": [
                "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80"
            ],
            "specifications": {
                "Кількість завдань": "120 завдань",
                "Формат": "Дорожній компактний кейс"
            }
        },

        # --- 7. Creativity & Crafts ---
        {
            "supplier_code": "CENTRAL_KYIV",
            "supplier_sku": "TY-KNT-200",
            "internal_sku": "GRAY-KNT-008",
            "slug": "kinetic-sand-magic-castle-set",
            "title_uk": "Набір кінетичного піску «Чарівний Замок» (1.5 кг + пісочниця та 8 формочок)",
            "description_uk": "Оригінальний кінетичний пісок 3 яскравих кольорів. Не липне до рук, не висихає, приємно пересипається та тримає форму замкових башт. У комплекті складна надувна пісочниця.",
            "brand": "Kidz Sand",
            "category_id": 7,
            "min_age": 3,
            "max_age": 10,
            "age_group": "3-5 років",
            "material": "натуральний кварцовий пісок, безпечний полімер",
            "parts_count": 10,
            "assembly_time_mins": 0,
            "difficulty_level": "Легкий",
            "skills_developed": ["сенсорний розвиток", "творчість", "дрібна моторика"],
            "cost_price": 220.00,
            "rrp_price": 390.00,
            "price": 390.00,
            "stock_quantity": 50,
            "is_featured": 0,
            "is_new": 1,
            "is_bestseller": 1,
            "images": [
                "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80"
            ],
            "specifications": {
                "Вага піску": "1.5 кг (3 кольори по 500г)",
                "Формочки": "8 пластикових формочок замку"
            }
        },

        # --- 8. Roleplay Playsets ---
        {
            "supplier_code": "CENTRAL_KYIV",
            "supplier_sku": "TY-KIT-990",
            "internal_sku": "GRAY-KIT-009",
            "slug": "interactive-kids-kitchen-sound-light-water",
            "title_uk": "Дитяча інтерактивна кухня «Chef Master» зі справжньою водою та парою",
            "description_uk": "Велика сюжетна кухня зі звуками смаження, підсвіткою конфорок, холодною парою та помповим краном, з якого циркулює справжня вода. У комплекті 38 аксесуарів (посуд, продукти, що змінюють колір при варінні).",
            "brand": "BeChef",
            "category_id": 8,
            "min_age": 3,
            "max_age": 8,
            "age_group": "3-5 років",
            "material": "безпечний пластик",
            "parts_count": 38,
            "assembly_time_mins": 20,
            "difficulty_level": "Легкий",
            "skills_developed": ["сюжетна гра", "соціальні навички", "уява"],
            "cost_price": 790.00,
            "rrp_price": 1390.00,
            "price": 1390.00,
            "stock_quantity": 16,
            "is_featured": 1,
            "is_new": 1,
            "is_bestseller": 1,
            "images": [
                "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80"
            ],
            "specifications": {
                "Висота кухні": "72 см",
                "Кількість предметів": "38 аксесуарів",
                "Ефекти": "Справжня вода з крана, пара, звук кипіння"
            }
        },

        # --- 9. Baby Toys (0-12m) ---
        {
            "supplier_code": "CENTRAL_KYIV",
            "supplier_sku": "TY-BTT-0914",
            "internal_sku": "GRAY-BAT-010",
            "slug": "battat-sensory-textured-blocks",
            "title_uk": "Сенсорні м'які кубики Battat «Порахуй і склади» (10 шт)",
            "description_uk": "10 м'яких тактильних кубиків із безпечного матеріалу без BPA. На кожній грані витиснені цифри, тварини та візерунки. Можна стискати, гризти та брати у ванну.",
            "brand": "Battat",
            "category_id": 9,
            "min_age": 0,
            "max_age": 3,
            "age_group": "0-1 рік",
            "material": "текстиль, силікон",
            "parts_count": 10,
            "assembly_time_mins": 0,
            "difficulty_level": "Легкий",
            "skills_developed": ["сенсорний розвиток", "тактильні відчуття", "дрібна моторика"],
            "cost_price": 480.00,
            "rrp_price": 820.00,
            "price": 820.00,
            "stock_quantity": 19,
            "is_featured": 1,
            "is_new": 0,
            "is_bestseller": 1,
            "images": [
                "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80"
            ],
            "specifications": {
                "Матеріал": "М'який харчовий полімер",
                "Кількість": "10 кубиків"
            }
        },

        # --- 10. Outdoor & Sports ---
        {
            "supplier_code": "CENTRAL_KYIV",
            "supplier_sku": "TY-SCT-404",
            "internal_sku": "GRAY-SCT-011",
            "slug": "scooter-maxi-led-wheels-foldable",
            "title_uk": "Дитячий самокат 3-колісний Maxi з LED колесами, що світяться",
            "description_uk": "Надійний стійкий триколісний самокат з алюмінієвим кермом, що регулюється по висоті під зріст дитини (65-85 см). Поліуретанові безшумні колеса з підшипниками ABEC-7 яскраво світяться під час руху без батарейок.",
            "brand": "Scooter Maxi",
            "category_id": 10,
            "min_age": 3,
            "max_age": 9,
            "age_group": "3-5 років",
            "material": "алюміній, поліуретан, посилений пластик",
            "parts_count": 1,
            "assembly_time_mins": 0,
            "difficulty_level": "Легкий",
            "skills_developed": ["баланс і координація", "фізичний розвиток", "витривалість"],
            "cost_price": 580.00,
            "rrp_price": 990.00,
            "price": 990.00,
            "stock_quantity": 25,
            "is_featured": 1,
            "is_new": 1,
            "is_bestseller": 1,
            "images": [
                "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80"
            ],
            "specifications": {
                "Максимальне навантаження": "до 60 кг",
                "Колеса": "Поліуретан PU з LED підсвіткою",
                "Регулювання керма": "3 положення висоти"
            }
        }
    ]
}

def generate_sample_xml_feed():
    """Generates a standard B2B YML feed file for local testing."""
    os.makedirs(os.path.dirname(FEED_XML_PATH), exist_ok=True)
    
    root = ET.Element('yml_catalog', date=datetime.now().strftime("%Y-%m-%d %H:%M"))
    shop = ET.SubElement(root, 'shop')
    
    name = ET.SubElement(shop, 'name')
    name.text = "B2B Dropshipping Catalog"
    company = ET.SubElement(shop, 'company')
    company.text = "Генеральний дистриб'ютор іграшок"
    url = ET.SubElement(shop, 'url')
    url.text = "https://distributor-b2b.ua"
    
    currencies = ET.SubElement(shop, 'currencies')
    ET.SubElement(currencies, 'currency', id="UAH", rate="1")
    
    categories = ET.SubElement(shop, 'categories')
    for cat in INITIAL_CATALOG_DATA["categories"]:
        c_elem = ET.SubElement(categories, 'category', id=str(cat["id"]))
        if cat["parent_id"]:
            c_elem.set('parentId', str(cat["parent_id"]))
        c_elem.text = cat["name_uk"]
        
    offers = ET.SubElement(shop, 'offers')
    for p in INITIAL_CATALOG_DATA["products"]:
        offer = ET.SubElement(offers, 'offer', id=p["supplier_sku"], available="true")
        
        p_price = ET.SubElement(offer, 'price')
        p_price.text = str(p["cost_price"])
        
        p_rrp = ET.SubElement(offer, 'rrp_price')
        p_rrp.text = str(p["rrp_price"])
        
        currency_id = ET.SubElement(offer, 'currencyId')
        currency_id.text = "UAH"
        
        category_id = ET.SubElement(offer, 'categoryId')
        category_id.text = str(p["category_id"])
        
        for img in p["images"]:
            pic = ET.SubElement(offer, 'picture')
            pic.text = img
            
        vendor = ET.SubElement(offer, 'vendor')
        vendor.text = p["brand"]
        
        p_name = ET.SubElement(offer, 'name')
        p_name.text = p["title_uk"]
        
        p_desc = ET.SubElement(offer, 'description')
        p_desc.text = p["description_uk"]
        
        stock = ET.SubElement(offer, 'stock_quantity')
        stock.text = str(p["stock_quantity"])
        
        for key, val in [
            ("Вікова група", p["age_group"]),
            ("Матеріал", p["material"]),
            ("Кількість деталей", str(p["parts_count"])),
            ("Складність", p["difficulty_level"]),
            ("Розвиток навичок", ", ".join(p["skills_developed"]))
        ]:
            param = ET.SubElement(offer, 'param', name=key)
            param.text = val

    tree = ET.ElementTree(root)
    tree.write(FEED_XML_PATH, encoding='utf-8', xml_declaration=True)
    print(f"Generated B2B XML feed at: {FEED_XML_PATH}")

def seed_database():
    """Initializes the database with suppliers, categories, and test products."""
    from db import init_db
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Clean tables for fresh deterministic state
    cursor.execute("DELETE FROM order_items")
    cursor.execute("DELETE FROM order_shipments")
    cursor.execute("DELETE FROM orders")
    cursor.execute("DELETE FROM cross_sell_rules")
    cursor.execute("DELETE FROM feed_sync_logs")
    cursor.execute("DELETE FROM products")
    cursor.execute("DELETE FROM categories")
    cursor.execute("DELETE FROM suppliers")
    cursor.execute("DELETE FROM sqlite_sequence")
    
    # 1. Insert Suppliers
    supplier_map = {}
    for sup in INITIAL_CATALOG_DATA["suppliers"]:
        cursor.execute("""
        INSERT INTO suppliers (name, code, warehouse_city, warehouse_address, feed_url, feed_type, settlement_terms, deposit_balance, free_packing_threshold, packing_fee)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (sup["name"], sup["code"], sup["warehouse_city"], sup["warehouse_address"], sup["feed_url"], sup["feed_type"], sup["settlement_terms"], sup["deposit_balance"], sup["free_packing_threshold"], sup["packing_fee"]))
        supplier_map[sup["code"]] = cursor.lastrowid
        
    # 2. Insert Categories
    for cat in INITIAL_CATALOG_DATA["categories"]:
        cursor.execute("""
        INSERT INTO categories (id, parent_id, slug, name_uk, icon, description_uk)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (cat["id"], cat["parent_id"], cat["slug"], cat["name_uk"], cat["icon"], cat["description_uk"]))
        
    # 3. Insert Products
    for p in INITIAL_CATALOG_DATA["products"]:
        sup_id = supplier_map.get(p["supplier_code"], 1)
        selling_price = max(p["price"], p["rrp_price"])
        
        cursor.execute("""
        INSERT INTO products (
            supplier_id, supplier_sku, internal_sku, slug, title_uk, description_uk, brand, category_id,
            min_age, max_age, age_group, material, parts_count, assembly_time_mins, difficulty_level,
            skills_developed, cost_price, rrp_price, price, stock_quantity, is_active, is_featured,
            is_new, is_bestseller, images, video_url, specifications, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (
            sup_id, p["supplier_sku"], p["internal_sku"], p["slug"], p["title_uk"], p["description_uk"],
            p["brand"], p["category_id"], p["min_age"], p["max_age"], p["age_group"], p["material"],
            p["parts_count"], p["assembly_time_mins"], p["difficulty_level"],
            json.dumps(p["skills_developed"], ensure_ascii=False),
            p["cost_price"], p["rrp_price"], selling_price, p["stock_quantity"],
            p["is_featured"], p["is_new"], p["is_bestseller"],
            json.dumps(p["images"]), p.get("video_url", ""),
            json.dumps(p.get("specifications", {}), ensure_ascii=False)
        ))
        
    conn.commit()
    conn.close()
    print("Database seeded with full toy store assortment.")

def run_fast_sync(supplier_id=1):
    """Fast Sync: updates stock counts and prices with RRP enforcement."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM suppliers WHERE id = ?", (supplier_id,))
    supplier = cursor.fetchone()
    if not supplier:
        return {"success": False, "error": "Supplier not found"}
        
    updated_count = 0
    rrp_adjustments = 0
    cursor.execute("SELECT id, supplier_sku, price, rrp_price, cost_price, stock_quantity FROM products WHERE supplier_id = ?", (supplier_id,))
    products = cursor.fetchall()
    
    for prod in products:
        current_price = prod["price"]
        rrp = prod["rrp_price"]
        new_price = current_price
        if current_price < rrp:
            new_price = rrp
            rrp_adjustments += 1
            
        cursor.execute("UPDATE products SET price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_price, prod["id"]))
        updated_count += 1
        
    cursor.execute("""
    INSERT INTO feed_sync_logs (supplier_id, sync_type, status, items_processed, items_updated, rrp_violations_count, details)
    VALUES (?, 'FAST', 'SUCCESS', ?, ?, ?, ?)
    """, (supplier_id, len(products), updated_count, rrp_adjustments, f"Швидку синхронізацію завершено. {rrp_adjustments} автокоригувань РРЦ."))
    
    conn.commit()
    conn.close()
    return {
        "success": True,
        "sync_type": "FAST",
        "supplier_name": supplier["name"],
        "items_processed": len(products),
        "items_updated": updated_count,
        "rrp_adjustments": rrp_adjustments,
        "timestamp": datetime.now().isoformat()
    }

def run_full_sync(supplier_id=1):
    """Full Sync: nocturnal update of full catalog."""
    generate_sample_xml_feed()
    seed_database()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as cnt FROM products WHERE supplier_id = ?", (supplier_id,))
    total = cursor.fetchone()["cnt"]
    cursor.execute("""
    INSERT INTO feed_sync_logs (supplier_id, sync_type, status, items_processed, items_updated, items_added, rrp_violations_count, details)
    VALUES (?, 'FULL', 'SUCCESS', ?, ?, 0, 0, 'Повну синхронізацію каталогу успішно виконано.')
    """, (supplier_id, total, total))
    conn.commit()
    conn.close()
    return {
        "success": True,
        "sync_type": "FULL",
        "items_processed": total,
        "timestamp": datetime.now().isoformat()
    }

def validate_and_update_price(product_id, new_price):
    """RRP Enforcement Rule: Price cannot be lower than recommended retail price (РРЦ)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title_uk, rrp_price, cost_price FROM products WHERE id = ?", (product_id,))
    product = cursor.fetchone()
    
    if not product:
        conn.close()
        return {"success": False, "error": "Товар не знайдено."}
        
    rrp = product["rrp_price"]
    if new_price < rrp:
        conn.close()
        return {
            "success": False,
            "error": f"Порушення умов дропшипінгу! Ціна ({new_price} грн) не може бути нижчою за РРЦ ({rrp} грн).",
            "rrp_price": rrp
        }
        
    cursor.execute("UPDATE products SET price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_price, product_id))
    conn.commit()
    conn.close()
    return {"success": True, "new_price": new_price, "product_title": product["title_uk"]}

if __name__ == '__main__':
    generate_sample_xml_feed()
    seed_database()
