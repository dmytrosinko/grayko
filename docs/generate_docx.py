import os
import docx
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def create_contract():
    doc = Document()

    # Set standard page margins (A4 standard: Top 2cm, Bottom 2cm, Left 2.5cm, Right 1.5cm)
    for section in doc.sections:
        section.top_margin = Inches(0.79)
        section.bottom_margin = Inches(0.79)
        section.left_margin = Inches(0.98)
        section.right_margin = Inches(0.59)

    # Base typography
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(11.5)
    normal_style.font.color.rgb = RGBColor(0, 0, 0)
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(4)

    def add_title(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(text)
        run.font.bold = True
        run.font.size = Pt(13.5)
        return p

    def add_subtitle(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(10)
        run = p.add_run(text)
        run.font.bold = True
        run.font.size = Pt(11.5)
        return p

    def add_section_header(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(9)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(text)
        run.font.bold = True
        run.font.size = Pt(11.5)
        return p

    def add_p(text, bold_prefix=None, indent=True):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        if indent:
            p.paragraph_format.first_line_indent = Inches(0.39)
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.font.bold = True
        p.add_run(text)
        return p

    # --- Title ---
    add_title('ДОГОВІР КОМІСІЇ № _____/TOYSI')
    add_subtitle('на реалізацію дитячих товарів та іграшок')

    # City and Date
    city_date_table = doc.add_table(rows=1, cols=2)
    city_date_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    city_date_table.autofit = False
    c_left, c_right = city_date_table.rows[0].cells
    c_left.width = Inches(3.2)
    c_right.width = Inches(3.2)
    
    p_l = c_left.paragraphs[0]
    p_l.add_run('м. Київ').font.bold = True
    
    p_r = c_right.paragraphs[0]
    p_r.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_r.add_run('«___» ____________ 202_ року').font.bold = True

    doc.add_paragraph()

    # Preambles
    add_p(' (надалі — «Комітент»), в особі _____________________________________________, що діє на підставі __________________________________, з однієї сторони, та', bold_prefix='[Повне найменування компанії Toysi / ТОВ / ФОП]')
    add_p(' (надалі — «Комісіонер»), в особі _____________________________________________, що діє на підставі __________________________________, з іншої сторони,', bold_prefix='[Найменування ФОП / ТОВ / інтернет-магазин Grayko]')
    add_p('разом іменовані — «Сторони», а кожна окремо — «Сторона», уклали цей Договір комісії (надалі — «Договір») про наступне:', indent=False)

    # 1. ПРЕДМЕТ ДОГОВОРУ
    add_section_header('1. ПРЕДМЕТ ДОГОВОРУ')
    add_p('1.1. За цим Договором Комісіонер зобов’язується за дорученням Комітента за комісійну винагороду здійснювати від свого імені, але за рахунок Комітента, продаж (реалізацію) третім особам (Кінцевим покупцям) товарів дитячого асортименту, іграшок та супутньої продукції (надалі — «Товар»), що постачаються/надаються Комітентом.')
    add_p('1.2. Найменування, асортимент, кількість, характеристики, рекомендована роздрібна ціна (РРЦ) та базова (оптова) вартість Товару визначаються в електронному каталозі / B2B-кабінеті / XML/YML-вивантаженні (фіді) Комітента або у відповідних рахунках-фактурах, специфікаціях чи накладних, що є невід’ємною частиною цього Договору.')
    add_p('1.3. Право власності на Товар належить Комітенту до моменту переходу права власності на Товар до Кінцевого покупця (моменту отримання та повної оплати Товару покупцем).')

    # 2. ПРАВА ТА ОБОВ'ЯЗКИ СТОРІН
    add_section_header('2. ПРАВА ТА ОБОВ’ЯЗКИ СТОРІН')
    add_p('2.1. Комісіонер зобов’язується:')
    add_p('2.1.1. Здійснювати продаж Товару Комітента на власному веб-ресурсі (сайті інтернет-магазину), маркетплейсах та інших узгоджених каналах продажу від власного імені.')
    add_p('2.1.2. Забезпечувати достовірне інформування покупців про споживчі властивості, вікові обмеження, характеристики та наявність Товару на підставі актуальних даних, наданих Комітентом.')
    add_p('2.1.3. Своєчасно передавати замовлення Комітенту для резервування та комплектації/відправки або самостійно отримувати Товар для доставки покупцям.')
    add_p('2.1.4. Надавати Комітенту періодичний Звіт Комісіонера про реалізований Товар у порядку та строки, встановлені цим Договором.')
    add_p('2.1.5. Своєчасно здійснювати розрахунки з Комітентом за реалізований Товар згідно з умовами цього Договору.')

    add_p('2.2. Комісіонер має право:')
    add_p('2.2.1. На своєчасне та повне отримання комісійної винагороди згідно з умовами Договору.')
    add_p('2.2.2. Утримувати належну йому комісійну винагороду з грошових коштів, які надійшли від Кінцевих покупців за реалізований Товар, якщо інше не погоджено Сторонами.')
    add_p('2.2.3. Встановлювати кінцеву роздрібну ціну продажу Товару з дотриманням узгодженої з Комітентом цінової політики (РРЦ).')

    add_p('2.3. Комітент зобов’язується:')
    add_p('2.3.1. Забезпечувати належну якість Товару, відповідність Технічному регламенту безпечності іграшок (Постанова КМУ №151), наявність необхідних сертифікатів/декларацій, маркування державною мовою та інструкцій.')
    add_p('2.3.2. Надавати Комісіонеру актуальну інформацію про залишки, ціни та описи товарів через електронні канали зв’язку (B2B-портал, API, XML/YML-фід).')
    add_p('2.3.3. Забезпечувати своєчасне комплектування, якісне пакування та відправку узгоджених замовлень логістичними службами або відвантаження на склад Комісіонера.')
    add_p('2.3.4. Приймати від Комісіонера Звіти про виконання доручення та підписувати Акти наданих послуг протягом 5 (п’яти) робочих днів з моменту отримання або надавати мотивовану відмову.')
    add_p('2.3.5. Приймати повернення бракованого Товару або гарантійні рекламації від покупців відповідно до законодавства України.')

    add_p('2.4. Комітент має право:')
    add_p('2.4.1. Вимагати від Комісіонера надання звітів про стан виконання комісійного доручення.')
    add_p('2.4.2. Контролювати дотримання цінової політики щодо рекомендованих роздрібних цін (РРЦ).')

    # 3. ПОРЯДОК РЕАЛІЗАЦІЇ ТОВАРУ ТА ДОСТАВКА
    add_section_header('3. ПОРЯДОК РЕАЛІЗАЦІЇ ТОВАРУ ТА ДОСТАВКА')
    add_p('3.1. Реалізація Товару може здійснюватись за моделлю прямої відправки покупцеві зі складу Комітента (дропшипінг) або шляхом поставки партії Товару на склад Комісіонера.')
    add_p('3.2. При прямій відправці Комітент формує та передає замовлення поштовому оператору за даними експрес-накладної (ТТН), сформованої Комісіонером або Комітентом, у строк не більше 24–48 годин з моменту підтвердження замовлення.')
    add_p('3.3. Ризик випадкового знищення або пошкодження Товару під час транспортування несе перевізник або відповідна Сторона згідно з правилами логістичного сервісу.')

    # 4. ЦІНА ТОВАРУ, КОМІСІЙНА ВИНАГОРОДА ТА ПОРЯДОК РОЗРАХУНКІВ
    add_section_header('4. ЦІНА ТОВАРУ, КОМІСІЙНА ВИНАГОРОДА ТА ПОРЯДОК РОЗРАХУНКІВ')
    add_p('4.1. Базова (оптова) вартість Товару визначається прайс-листом / B2B-системою Комітента на момент оформлення замовлення.')
    add_p('4.2. Розмір комісійної винагороди Комісіонера визначається як різниця між фактичною ціною реалізації Товару Кінцевому покупцю та базовою (оптовою) вартістю Комітента або у вигляді фіксованого відсотка згідно з узгодженими специфікаціями.')
    add_p('4.3. Розрахунки між Сторонами здійснюються у безготівковій формі шляхом перерахування грошових коштів на поточний банківський рахунок (IBAN) за однією з узгоджених схем: попередня оплата замовленого Товару або періодичний розрахунок за підсумками звітного періоду на підставі затвердженого Звіту Комісіонера.')

    # 5. ЗВІТНІСТЬ ТА ПРИЙНЯТТЯ НАДАНИХ ПОСЛУГ
    add_section_header('5. ЗВІТНІСТЬ ТА ПРИЙНЯТТЯ НАДАНИХ ПОСЛУГ')
    add_p('5.1. За підсумками звітного періоду (календарний місяць) Комісіонер формує та направляє Комітенту Звіт Комісіонера та/або Акт наданих послуг.')
    add_p('5.2. Комітент зобов’язаний розглянути та підписати Звіт Комісіонера протягом 5 (п’яти) робочих днів або надати письмові обґрунтовані зауваження. У разі ненадання зауважень у вказаний строк Звіт вважається прийнятим без заперечень.')

    # 6. ВІДПОВІДАЛЬНІСТЬ СТОРІН ТА ПОВЕРНЕННЯ ТОВАРУ
    add_section_header('6. ВІДПОВІДАЛЬНІСТЬ СТОРІН ТА ПОВЕРНЕННЯ ТОВАРУ')
    add_p('6.1. За невиконання або неналежне виконання зобов’язань Сторони несуть відповідальність відповідно до норм чинного законодавства України.')
    add_p('6.2. Повернення та обмін Товару належної якості від Кінцевих покупців здійснюється згідно із Законом України «Про захист прав споживачів» (протягом 14 календарних днів).')
    add_p('6.3. У разі виявлення виробничого браку Комітент здійснює безоплатну заміну або повертає сплачені за Товар кошти.')

    # 7. ФОРС-МАЖОР
    add_section_header('7. ОБСТАВИНИ НЕПЕРЕБОРНОЇ СИЛИ (ФОРС-МАЖОР)')
    add_p('7.1. Сторони звільняються від відповідальності за часткове чи повне невиконання зобов’язань за цим Договором, якщо це невиконання стало наслідком дій непереборної сили (воєнні дії, блокади, пожежі, стихійні лиха, регуляторні заборони тощо), засвідчених Торгово-промисловою палатою України.')

    # 8. СТРОК ДІЇ ДОГОВОРУ ТА ПРИКІНЦЕВІ ПОЛОЖЕННЯ
    add_section_header('8. СТРОК ДІЇ ДОГОВОРУ ТА ПРИКІНЦЕВІ ПОЛОЖЕННЯ')
    add_p('8.1. Договір набирає чинності з моменту підписання обома Сторонами і діє до «___» ____________ 202_ року, а в частині фінансових зобов’язань — до повного взаєморозрахунку.')
    add_p('8.2. Якщо за 30 днів до дати завершення дії Договору жодна зі Сторін не заявить письмово про його припинення, Договір вважається автоматично пролонгованим на кожний наступний календарний рік.')
    add_p('8.3. Сторони визнають юридичну силу документів, підписаних кваліфікованим електронним підписом (КЕП / Дія.Підпис / сервіси «Вчасно», «Paperless» тощо) або переданих шляхом обміну належно завіреними скан-копіями.')
    add_p('8.4. Договір складений українською мовою у двох оригінальних примірниках, які мають однакову юридичну силу, по одному для кожної із Сторін.')

    # 9. АДРЕСИ, РЕКВІЗИТИ ТА ПІДПИСИ СТОРІН
    add_section_header('9. АДРЕСИ, БАНКІВСЬКІ РЕКВІЗИТИ ТА ПІДПИСИ СТОРІН')

    table_req = doc.add_table(rows=10, cols=2)
    table_req.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_req.autofit = False

    for row in table_req.rows:
        row.cells[0].width = Inches(3.2)
        row.cells[1].width = Inches(3.2)

    def set_cell_text(cell, title, val='', bold=False):
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.05
        r1 = p.add_run(title)
        if bold:
            r1.font.bold = True
        if val:
            p.add_run(val)

    set_cell_text(table_req.rows[0].cells[0], 'КОМІТЕНТ (Toysi)', bold=True)
    set_cell_text(table_req.rows[0].cells[1], 'КОМІСІОНЕР (Grayko)', bold=True)

    set_cell_text(table_req.rows[1].cells[0], 'Найменування: ', '[ТОВ / ФОП Toysi]')
    set_cell_text(table_req.rows[1].cells[1], 'Найменування: ', '[ФОП / ТОВ Grayko]')

    set_cell_text(table_req.rows[2].cells[0], 'Юр. адреса: ', '___________________________')
    set_cell_text(table_req.rows[2].cells[1], 'Юр. адреса: ', '___________________________')

    set_cell_text(table_req.rows[3].cells[0], 'Код ЄДРПОУ/РНОКПП: ', '_______________')
    set_cell_text(table_req.rows[3].cells[1], 'Код ЄДРПОУ/РНОКПП: ', '_______________')

    set_cell_text(table_req.rows[4].cells[0], 'IBAN: ', '__________________________________')
    set_cell_text(table_req.rows[4].cells[1], 'IBAN: ', '__________________________________')

    set_cell_text(table_req.rows[5].cells[0], 'Банк: ', '__________________________________')
    set_cell_text(table_req.rows[5].cells[1], 'Банк: ', '__________________________________')

    set_cell_text(table_req.rows[6].cells[0], 'Email: ', '_________________________________')
    set_cell_text(table_req.rows[6].cells[1], 'Email: ', '_________________________________')

    set_cell_text(table_req.rows[7].cells[0], 'Тел: ', '___________________________________')
    set_cell_text(table_req.rows[7].cells[1], 'Тел: ', '___________________________________')

    set_cell_text(table_req.rows[8].cells[0], '\nПідпис: ________________ / ____________ /', bold=False)
    set_cell_text(table_req.rows[8].cells[1], '\nПідпис: ________________ / ____________ /', bold=False)

    set_cell_text(table_req.rows[9].cells[0], 'М.П. (за наявності)', bold=False)
    set_cell_text(table_req.rows[9].cells[1], 'М.П. (за наявності)', bold=False)

    # --- Page Break for Annex 1 ---
    doc.add_page_break()

    add_title('ДОДАТОК № 1')
    add_subtitle('до Договору комісії № _____/TOYSI від «___» __________ 202_ року')
    add_section_header('ЗРАЗОК: ЗВІТ КОМІСІОНЕРА / АКТ НАДАНИХ ПОСЛУГ')
    
    p_period = doc.add_paragraph()
    p_period.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_period.add_run('за період з «___» __________ 202_ р. по «___» __________ 202_ р.').font.italic = True

    add_p('1. Комісіонером за вказаний період було реалізовано наступний Товар Комітента:', indent=False)

    # Report Table
    rep_table = doc.add_table(rows=4, cols=7)
    rep_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    rep_table.autofit = False

    headers = ['№', 'Артикул', 'Найменування Товару', 'К-сть', 'Базова ціна (грн)', 'Сума продажу (грн)', 'Комісійна винагорода (грн)']
    widths = [Inches(0.4), Inches(0.9), Inches(1.8), Inches(0.55), Inches(0.9), Inches(0.95), Inches(1.1)]

    for j, h in enumerate(headers):
        cell = rep_table.rows[0].cells[j]
        cell.width = widths[j]
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9.5)

    sample_row1 = ['1', 'TOY-101', 'Конструктор дитячий', '5', '450.00', '3 250.00', '1 000.00']
    sample_row2 = ['2', 'TOY-204', 'Розвиваюча дерев’яна гра', '3', '320.00', '1 440.00', '480.00']

    for j, val in enumerate(sample_row1):
        cell = rep_table.rows[1].cells[j]
        cell.width = widths[j]
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if j in [0, 1, 3] else (WD_ALIGN_PARAGRAPH.RIGHT if j >= 4 else WD_ALIGN_PARAGRAPH.LEFT)
        r = p.add_run(val)
        r.font.size = Pt(9.5)

    for j, val in enumerate(sample_row2):
        cell = rep_table.rows[2].cells[j]
        cell.width = widths[j]
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if j in [0, 1, 3] else (WD_ALIGN_PARAGRAPH.RIGHT if j >= 4 else WD_ALIGN_PARAGRAPH.LEFT)
        r = p.add_run(val)
        r.font.size = Pt(9.5)

    total_row = ['', '', 'РАЗОМ:', '8', '3 210.00', '4 690.00', '1 480.00']
    for j, val in enumerate(total_row):
        cell = rep_table.rows[3].cells[j]
        cell.width = widths[j]
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if j >= 2 else WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(val)
        r.font.bold = True
        r.font.size = Pt(9.5)

    # Style borders
    tblBorders_xml = (
        f'<w:tblBorders {nsdecls("w")}>\n'
        f'  <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>\n'
        f'  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>\n'
        f'  <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>\n'
        f'  <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>\n'
        f'  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>\n'
        f'  <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>\n'
        f'</w:tblBorders>'
    )
    rep_table._tbl.tblPr.append(parse_xml(tblBorders_xml))

    doc.add_paragraph()
    add_p('2. Сума, що підлягає перерахуванню Комітенту: ________________________________________________ грн.')
    add_p('3. Сума нарахованої/утриманої комісійної винагороди Комісіонера: ___________________________ грн.')
    add_p('4. Сторони не мають одна до одної взаємних претензій щодо повноти, строків та якості виконання доручення.')

    doc.add_paragraph()

    # Signatures for Annex
    annex_sig = doc.add_table(rows=1, cols=2)
    annex_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    annex_sig.rows[0].cells[0].width = Inches(3.2)
    annex_sig.rows[0].cells[1].width = Inches(3.2)

    p1 = annex_sig.rows[0].cells[0].paragraphs[0]
    p1.add_run('Від Комітента:\n\n_________________ / _________________ /\nМ.П.').font.size = Pt(11)

    p2 = annex_sig.rows[0].cells[1].paragraphs[0]
    p2.add_run('Від Комісіонера:\n\n_________________ / _________________ /\nМ.П.').font.size = Pt(11)

    # Save
    os.makedirs('docs', exist_ok=True)
    out_path = os.path.abspath('docs/Dogovir_Komisiyi_Toysi_Grayko.docx')
    doc.save(out_path)
    print(f'SUCCESS: Saved to {out_path}')

if __name__ == '__main__':
    create_contract()
