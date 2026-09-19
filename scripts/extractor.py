import pdfplumber
import json
import requests
import re
import os
import sys
import unicodedata
import traceback

# Configuración de codificación para Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

# Configuración de log interno
DEBUG_LOG = "extractor_debug.log"
with open(DEBUG_LOG, "w") as f: f.write("--- INICIO DE EXTRACCION ---\n")

def log_debug(msg):
    print(msg)
    with open(DEBUG_LOG, "a", encoding="utf-8") as f:
        f.write(str(msg) + "\n")

def clean_cid_and_spacing(text):
    if not text: return ""
    text = re.sub(r'\(cid:\d+\)', ' ', text)
    text = re.sub(r'\d{2}/\d{2}/\d{2,4}.*?Página \d+ de \d+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'GFPI- F-\d+ v\d+', '', text, flags=re.IGNORECASE)
    text = "".join(c for c in text if c.isprintable() or c in "\n\r\t")
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def normalize_text(text):
    if not text: return ""
    text = clean_cid_and_spacing(text)
    text = unicodedata.normalize('NFD', text)
    text = "".join([c for c in text if unicodedata.category(c) != 'Mn'])
    return text.upper().strip()

def ultra_normalize(text):
    if not text: return ""
    text = normalize_text(text)
    return re.sub(r'[^A-Z0-9]', '', text)

def normalize_date(date_str):
    """ Convierte fechas tipo '10 de Febrero 2025' o '10/02/2025' a ISO (YYYY-MM-DD) para MongoDB """
    if not date_str: return None
    months = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
        'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    }
    try:
        d = date_str.lower().replace(' de ', ' ').replace('/', ' ').replace('-', ' ')
        parts = d.split()
        if len(parts) < 3: return None
        day = parts[0].zfill(2)
        month = parts[1]
        year = parts[2]
        if month in months: month = months[month]
        else: month = month.zfill(2)
        if len(year) == 2: year = "20" + year
        return f"{year}-{month}-{day}"
    except: return None

class SenaExtractor:
    def __init__(self, program_pdf, project_pdf, team_pdf=None, fiche="000000"):
        self.program_pdf = program_pdf
        self.project_pdf = project_pdf
        self.team_pdf = team_pdf
        
        provided_fiche = str(fiche).strip()
        self.fiche = None
        
        # 1. Intentar autodetectar el número de ficha real del PDF del Equipo Ejecutor
        self._auto_detect_fiche()

        # 2. Si la detección falló o dio un valor inválido/placeholder, usar el parámetro provisto por el frontend
        if not self.fiche or self.fiche in ["000000", "", "EXTRACTED", "undefined", "null"] or "EXTRACTED" in self.fiche:
            num_match = re.search(r'\b(\d{5,9})\b', provided_fiche)
            candidate = num_match.group(1) if num_match else None
            if candidate:
                self.fiche = candidate
                log_debug(f"[INIT] Usando Ficha provista (fallback): {self.fiche}")
            else:
                self.fiche = "000000"
                log_debug(f"[INIT] Usando Ficha por defecto: {self.fiche}")
        else:
            log_debug(f"[INIT] Usando Ficha detectada de los PDFs: {self.fiche}")
            
        self.unique_raps_codes = set()
        self.in_activities_table = False
        self.global_rap_registry = set()
        self.data = {"pedagogicalPlanning": {"metadata": {"programName": "", "programCode": "", "totalHours": 0, "lectivaHours": 0, "productivaHours": 0, "teamPdfProcessed": False, "projectCode": ""}, "fiche": self.fiche, "status": "draft", "content": []}}
        
        self.competencies_data = {} 
        self.instructor_map = {}   
        self.temp_content = {}
        self.phase_activities = {}
        self.ap_full_names = {}
        self.current_ap_prefix = None
        # cambion efectuado por luis llanos
        self.materials_by_activity = {}
        self.general_materials = []
        self.environment_description = ""

    def _auto_detect_fiche(self):
        # La FICHA solo se detecta desde el PDF del Equipo Ejecutor (self.team_pdf).
        # El PDF del Proyecto Formativo aporta el CÓDIGO del proyecto
        # (metadata.projectCode), que NO debe usarse como número de ficha.
        if self.team_pdf:
            try:
                log_debug(f"[AUTO-DETECT] Buscando número de ficha en team_pdf: {self.team_pdf}")
                with pdfplumber.open(self.team_pdf) as pdf:
                    for page in pdf.pages[:3]:
                        text = page.extract_text()
                        if text:
                            match = re.search(r'(?:Ficha\s+de\s+caracterizaci[oó]n|Ficha\s+caracterizaci[oó]n|Ficha[s]?|N[uú]mero\s+de\s+ficha|N[o°\.]?\s*de\s*ficha|C[oó]digo\s+(?:de\s+)?(?:la\s+)?ficha)\s*:?\s*(\d{5,9})', text, re.IGNORECASE)
                            if match:
                                self.fiche = match.group(1).strip()
                                log_debug(f"[AUTO-DETECT] Ficha encontrada en team_pdf con patrón: {self.fiche}")
                                return

                            matches = re.findall(r'\b([1-4]\d{6,7})\b', text)
                            if matches:
                                self.fiche = matches[0].strip()
                                log_debug(f"[AUTO-DETECT] Ficha encontrada en team_pdf por secuencia numérica: {self.fiche}")
                                return
            except Exception as e:
                log_debug(f"[AUTO-DETECT] Error leyendo team_pdf: {e}")

        # Sin fallback al PDF de proyecto: el "Código Proyecto SOFIA" no es la ficha.
        log_debug("[AUTO-DETECT] No se detectó la ficha en team_pdf; se usará el valor provisto por el frontend.")

    def extract_program_details(self):
        """ PDF 1: DICCIONARIO DE DATOS (REFORZADO) """
        log_debug(f"[STEP 1] Analizando Programa (PDF 1)...")
        try:
            with pdfplumber.open(self.program_pdf) as pdf:
                all_text = ""
                for page in pdf.pages: all_text += (page.extract_text() or "") + "\n---PAGE---\n"
                
                all_text_clean = re.sub(r'\(cid:\d+\)', ' ', all_text)
                
                name_match = re.search(r'Denominaci[oó]n\s*\n?\s*(.*?)\s*\n?\s*del Programa:', all_text_clean, re.IGNORECASE)
                self.data["pedagogicalPlanning"]["metadata"]["programName"] = name_match.group(1).strip() if name_match else self._regex_find(r'Denominaci[oó]n\s*del Programa:\s*(.*)', all_text_clean, "PROGRAMA")
                
                code_match = re.search(r'C[oó]digo\s*\n?\s*(\d+)\s*\n?\s*Programa:', all_text_clean, re.IGNORECASE)
                self.data["pedagogicalPlanning"]["metadata"]["programCode"] = code_match.group(1).strip() if code_match else self._regex_find(r'C[oó]digo\s*Programa:\s*(\d+)', all_text_clean, "000000")
                
                lectiva_match = re.search(r'Etapa\s+Lectiva:\s*(\d+)\s*horas', all_text_clean, re.IGNORECASE)
                if lectiva_match:
                    self.data["pedagogicalPlanning"]["metadata"]["lectivaHours"] = int(lectiva_match.group(1))

                productiva_match = re.search(r'Etapa\s+Productiva:\s*(\d+)\s*horas', all_text_clean, re.IGNORECASE)
                if productiva_match:
                    self.data["pedagogicalPlanning"]["metadata"]["productivaHours"] = int(productiva_match.group(1))

                total_match = re.search(r'T+o+t+a+l+::?\s*(\d+)\s*horas', all_text_clean, re.IGNORECASE)
                if total_match:
                    self.data["pedagogicalPlanning"]["metadata"]["totalHours"] = int(total_match.group(1))
                
                comp_sections = re.split(r'CONTENIDOS\s+CURRICULARES', all_text_clean, flags=re.IGNORECASE)
                for section in comp_sections[1:]:
                    code_match = re.search(r'\b(\d{9})\b', section)
                    if not code_match: continue
                    code = code_match.group(1)

                    # 1. REMOVER RUIDO DE ENCABEZADOS DE PÁGINA REPETIDOS DENTRO DE LA SECCIÓN
                    section_clean = re.sub(r'P[aá]gina \d+ de \d+', '', section, flags=re.IGNORECASE)
                    section_clean = re.sub(r'DENOMINACI[OÓ]N DEL PROGRAMA.*?\n', '', section_clean, flags=re.IGNORECASE)

                    # 2. EXTRACCIÓN MEJORADA DEL NOMBRE DE LA COMPETENCIA
                    name_match = re.search(
                        r'(?:4\.1\s+Norma\s*/\s*Unidad\s*de\s*Competencia|4\.1|COMPETENCIA)\s*(.*?)\s*(?:4\.2|C[OÓ]DIGO|DURACI[OÓ]N)',
                        section_clean, re.IGNORECASE | re.DOTALL
                    )
                    raw_name = name_match.group(1) if name_match else f"{code}"

                    # 3. LIMPIEZA QUIRÚRGICA: quita "COMPETENCIA" en cualquier parte del texto,
                    #    no solo al inicio/final (la etiqueta "NORMA/UNIDAD DE COMPETENCIA" queda
                    #    partida por el salto de línea del PDF, y a veces la palabra suelta
                    #    termina metida en medio de la frase real).
                    # IMPORTANTE: en algunos PDFs de SENA el encabezado "4.1 NORMA /
                    # UNIDAD DE COMPETENCIA" aparece EN MEDIO del nombre real, por
                    # cómo pdfplumber reconstruye las líneas (ej. "INTERACTUAR EN
                    # LENGUA INGLESA...CONTEXTOS" + "4.1 NORMA / UNIDAD DE" +
                    # "SOCIALES Y LABORALES..." + "COMPETENCIA" + "EUROPEO..."). El
                    # regex anterior (`^.*?NORMA...DE`) borraba TODO desde el inicio
                    # del texto hasta ese encabezado, mutilando la primera mitad del
                    # nombre real. Ahora solo se quita la etiqueta puntual donde
                    # aparezca, sin tocar nada más alrededor.
                    full_name = raw_name
                    full_name = re.sub(r'4\.1\s+NORMA\s*/\s*UNIDAD\s+DE(?:\s+COMPETENCIA)?', ' ', full_name, flags=re.IGNORECASE)
                    full_name = re.sub(r'\bCOMPETENCIA\b', '', full_name, flags=re.IGNORECASE)
                    full_name = re.sub(r'^\s*4\.1\s*', '', full_name, flags=re.IGNORECASE)
                    full_name = clean_cid_and_spacing(full_name).upper().strip()

                    # Fallback inteligente para inglés
                    if len(full_name) < 15 and code == "240202501":
                        full_name = "INTERACTUAR EN LENGUA EXTRANJERA SEGÚN ESTILOS DE VIDA ACTIVA, " + full_name

                    # EXTRACCIÓN DE DURACIÓN (Numeral 4.4) -> usa section_clean
                    dur_match = re.search(r'4\.4\s+DURACI[OÓ]N\s+M[AÁ]XIMA.*?(\d+)\s*horas', section_clean, re.IGNORECASE | re.DOTALL)
                    duration = int(dur_match.group(1)) if dur_match else 0
                    
                    self.competencies_data[code] = {"name": full_name, "code": code, "duration": duration, "concepts": [], "processes": [], "criteria": [], "academicRequirements": ""}
                    
                    s_match = re.search(r'CONOCIMIENTOS\s+DEL\s+SABER\s*(.*?)\s*(?:CONOCIMIENTOS\s+DE\s+PROCESO|CRITERIOS|4\.)', section_clean, re.IGNORECASE | re.DOTALL)
                    if s_match: self.competencies_data[code]["concepts"] = self._clean_list(s_match.group(1))
                    p_match = re.search(r'CONOCIMIENTOS\s+DE\s+PROCESO\s*(.*?)\s*(?:CONOCIMIENTOS\s+DEL\s+SABER|CRITERIOS|4\.)', section_clean, re.IGNORECASE | re.DOTALL)
                    if p_match: self.competencies_data[code]["processes"] = self._clean_list(p_match.group(1))
                    c_match = re.search(r'CRITERIOS\s+DE\s+EVALUACI[OÓ]N\s*(.*?)\s*(?:PERFIL|CONTENIDOS|4\.|5\.|6\.)', section_clean, re.IGNORECASE | re.DOTALL)
                    if c_match: self.competencies_data[code]["criteria"] = self._clean_list(c_match.group(1))
                    
                    req_match = re.search(r'(?:4\.8\.1\s+Requisitos\s+Acad[eé]micos\s+M[ií]nimos|Requisitos\s+Acad[eé]micos)\s*(.*?)\s*(?:4\.8\.2|Experiencia|Perfil|5\.)', section_clean, re.IGNORECASE | re.DOTALL)
                    if req_match:
                        self.competencies_data[code]["academicRequirements"] = clean_cid_and_spacing(req_match.group(1)).upper().strip()
        except Exception as e: log_debug(f"[ERROR PDF 1] {e}")

    def extract_team_details(self):
        if not self.team_pdf: return
        log_debug(f"[STEP 1.5] Analizando Equipo (PDF 3)...")
        try:
            with pdfplumber.open(self.team_pdf) as pdf:
                full_text = ""
                for page in pdf.pages: full_text += (page.extract_text() or "") + "\n"
                
                date_p = r'(\d{1,2}(?:\s+de\s+[a-zA-Z]+|\s*[\/\-]\s*\d{1,2})\s*[\/\-]?\s*\d{2,4})'
                s_match = re.search(r'\b(?:fecha\s+)?inicio\s+etapa\s+lectiva\s+' + date_p, full_text, re.IGNORECASE)
                if s_match: self.data["pedagogicalPlanning"]["metadata"]["lectivaStartDate"] = normalize_date(s_match.group(1))
                e_match = re.search(r'\b(?:fecha\s+)?fin\s+etapa\s+lectiva\s+' + date_p, full_text, re.IGNORECASE)
                if e_match: self.data["pedagogicalPlanning"]["metadata"]["lectivaEndDate"] = normalize_date(e_match.group(1))

                for page in pdf.pages:
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if not row or len(row) < 2: continue
                            instructor = clean_cid_and_spacing(str(row[0]))
                            if not instructor or normalize_text(instructor) in ["INSTRUCTOR", "NOMBRE", "COMPETENCIAS"]: continue
                            
                            c_raw = str(row[1])
                            c_lines = re.split(r'[•●\-\*]|\n', c_raw)
                            for c_line in c_lines:
                                line_clean = clean_cid_and_spacing(c_line)
                                if len(line_clean) < 10: continue
                                
                                code_m = re.search(r'\b(\d{9})\b', line_clean)
                                if code_m:
                                    self.instructor_map[code_m.group(1)] = instructor
                                else:
                                    words = {w for w in normalize_text(line_clean).split() if len(w) > 3}
                                    if words:
                                        if "keyword_matches" not in self.instructor_map: self.instructor_map["keyword_matches"] = []
                                        self.instructor_map["keyword_matches"].append({"keywords": words, "name": instructor})
            log_debug(f"  [PDF 3] Datos procesados.")
            self.data["pedagogicalPlanning"]["metadata"]["teamPdfProcessed"] = True
        except Exception as e: log_debug(f"[ERROR PDF 3] {e}")

    def _get_suggested_instructor(self, c_code, c_full_name):
        if c_code in self.instructor_map: return self.instructor_map[c_code]
        if "keyword_matches" in self.instructor_map:
            comp_words = {w for w in normalize_text(c_full_name).split() if len(w) > 3}
            best_match, max_overlap = "", 0
            for entry in self.instructor_map["keyword_matches"]:
                overlap = len(comp_words.intersection(entry["keywords"]))
                if overlap > max_overlap:
                    max_overlap = overlap
                    best_match = entry["name"]
            if max_overlap > 0 and (max_overlap / len(comp_words)) >= 0.4: return best_match
        return ""

    def _detect_phase(self, text):
        if not text: return None
        raw = clean_cid_and_spacing(text).upper()
        if len(raw) < 5 or len(raw) > 50: return None
        nl = normalize_text(raw)
        if  "ANALISIS" in nl : return "ANALYSIS"
        if "PLANEACION" in nl: return "PLANNING"
        if  "EJECUCION" in nl: return "EXECUTION"
        if  "EVALUACION" in nl: return "EVALUATION"
        if  "INDUCCION" in nl: return "INDUCCION"
        if "ETAPA" in nl and "PRODUCTIVA" in nl: return "ETAPA_PRODUCTIVA"
        if "ETAPAPRODUCTIVA" in nl : return "ETAPA_PRODUCTIVA"
        return None

    def _get_materials_for_activity(self, project_act):
        # cambion efectuado por luis llanos
        if not project_act:
            return self.general_materials if self.general_materials else []
        
        def get_words(text):
            if not text: return set()
            t = unicodedata.normalize('NFD', text)
            t = "".join([c for c in t if unicodedata.category(c) != 'Mn'])
            t = re.sub(r'[^A-Z0-9\s]', ' ', t.upper())
            return set(w for w in t.split() if len(w) > 2)

        p_words = get_words(project_act)
        best_act = None
        best_score = 0.0
        for act_name, mats in self.materials_by_activity.items():
            a_words = get_words(act_name)
            if not p_words or not a_words: continue
            score = len(p_words.intersection(a_words)) / min(len(p_words), len(a_words))
            if score > best_score:
                best_score = score
                best_act = act_name
        
        if best_act and best_score >= 0.45:
            return self.materials_by_activity[best_act]
        elif self.general_materials:
            return self.general_materials
        return []

    def extract_project_materials(self):
        # cambion efectuado por luis llanos
        log_debug(f"[STEP 2.0] Extrayendo Materiales de Formación y Ambiente (PDF 2)...")
        current_act = ''
        in_37 = False
        in_371 = False

        ignore_act_keywords = ['ACTIVIDADES DEL PROYECTO', '3.7', 'MODELO DE MEJORA', 'DURACI', 'CODIGO', 'CÓDIGO', 'SOFIA', 'PROGRAMA', 'SISTEMA INTEGRADO', 'PAGINA', 'PÁGINA', 'PROYECTO FORMATIVO', 'INFORMACI']
        ignore_mat_keywords = ['DESCRIPCI', 'MATERIALES', 'MODELO DE MEJORA', 'CANT.', 'V. UNIT', 'V. TOTAL', 'HERRAMIENTAS', 'EQUIPOS', 'MATERIALES DE FORMACION', 'TALENTO HUMANO', 'TOTAL']

        try:
            with pdfplumber.open(self.project_pdf) as pdf:
                for page in pdf.pages:
                    text = page.extract_text() or ''
                    if 'ambiente de aprendizaje' in text.lower() and not self.environment_description:
                        env_match = re.search(r'Descripci.*?n\s+del\s+ambiente\s+de\s+aprendizaje\s+requerido\s*\n\s*(.*?)(?:\n\d{2}/\d{2}/\d{4}|\n\d+\.|\Z)', text, re.IGNORECASE | re.DOTALL)
                        if env_match:
                            self.environment_description = clean_cid_and_spacing(env_match.group(1)).strip()

                    tables = page.extract_tables()
                    for table in tables:
                        mat_col_idx = 10
                        for row in table:
                            if not row: continue
                            row_str = ' '.join(str(c or '') for c in row)
                            if '3.7. Recursos estimados' in row_str or '3.7 Recursos estimados' in row_str or 'Materiales de formaci' in row_str:
                                in_37 = True
                                in_371 = False
                            if '3.7.1' in row_str or 'Detalle de los recursos estimados' in row_str:
                                in_37 = False
                                in_371 = True
                            if '4. Rubros presupuestales' in row_str or '5. Equipo que particip' in row_str:
                                in_37 = False
                                in_371 = False

                            if in_37:
                                if any('Materiales de formaci' in str(c) for c in row):
                                    for c_idx, c in enumerate(row):
                                        if c and 'Materiales de formaci' in str(c):
                                            mat_col_idx = c_idx
                                            break
                                if len(row) > mat_col_idx:
                                    act_cell = row[0]
                                    if act_cell:
                                        cleaned_act = clean_cid_and_spacing(act_cell).upper()
                                        if len(cleaned_act) > 15 and not any(k in cleaned_act for k in ignore_act_keywords):
                                            if current_act and (cleaned_act.startswith(current_act[:20]) or current_act.startswith(cleaned_act[:20])):
                                                if len(cleaned_act) > len(current_act):
                                                    self.materials_by_activity[cleaned_act] = self.materials_by_activity.pop(current_act, [])
                                                    current_act = cleaned_act
                                            else:
                                                current_act = cleaned_act
                                    mat_cell = row[mat_col_idx]
                                    if mat_cell:
                                        cleaned_mat = clean_cid_and_spacing(mat_cell).upper()
                                        if len(cleaned_mat) > 2 and not any(k in cleaned_mat for k in ignore_mat_keywords):
                                            if current_act and cleaned_mat not in self.materials_by_activity.get(current_act, []):
                                                self.materials_by_activity.setdefault(current_act, []).append(cleaned_mat)

                            if in_371:
                                if len(row) >= 4:
                                    desc = clean_cid_and_spacing(str(row[0] or '')).upper()
                                    fuente = clean_cid_and_spacing(str(row[-1] or '')).upper()
                                    if 'MATERIALES PARA FORMACION' in fuente and desc and len(desc) > 2:
                                        if not any(k in desc for k in ignore_mat_keywords):
                                            if desc not in self.general_materials:
                                                self.general_materials.append(desc)

            log_debug(f"  [PDF 2] Actividades con materiales: {len(self.materials_by_activity)}, Materiales generales: {len(self.general_materials)}")
        except Exception as e:
            log_debug(f"[ERROR MATERIALES PDF 2] {e}")

    def extract_project_structure(self):
        log_debug(f"[STEP 2] Analizando Proyecto (PDF 2)...")
        # cambion efectuado por luis llanos
        self.extract_project_materials()
        current_phase = "ANALYSIS"
        last_comp = None
        try:
            with pdfplumber.open(self.project_pdf) as pdf:
                # El PDF 2 (Proyecto Formativo) aporta el CÓDIGO del proyecto (SOFIA).
                # Se busca en TODAS las páginas del documento, no solo en la primera.
                project_code = None
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    p_match = re.search(r'C[oó]digo\s+Proyecto(?:\s+SOFIA)?\s*:?\s*(\d{5,9})', page_text, re.IGNORECASE)
                    if p_match:
                        project_code = p_match.group(1).strip()
                        break
                if project_code:
                    self.data["pedagogicalPlanning"]["metadata"]["projectCode"] = project_code
                    log_debug(f"  [PDF 2] Código de proyecto SOFIA detectado: {project_code}")
                else:
                    log_debug("  [PDF 2] No se detectó el código de proyecto SOFIA en el documento")

                for page in pdf.pages:
                    if any(x in (page.extract_text() or "").upper() for x in ["TABLA DE CONTENIDO", "INDICE"]): continue
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if not row or len(row) < 2: continue
                            cells = [clean_cid_and_spacing(str(c)) for c in row]
                            comp_match = re.search(r'\b(\d{9})\b', " ".join(cells))
                            if comp_match:
                                self.in_activities_table = True
                                last_comp = comp_match.group(1)
                            for i in [0, 1]:
                                if i < len(cells):
                                    found = self._detect_phase(cells[i])
                                    if found: current_phase = found; break
                            if len(cells) > 1 and cells[1] and self.in_activities_table:
                                text_cell = cells[1].strip().upper()
                                text_cell = re.sub(r'\s+', ' ', text_cell)
                                is_noise = any(k in text_cell for k in [
                                    "SERVICIO NACIONAL DE APRENDIZAJE",
                                    "SISTEMA INTEGRADO DE GESTION",
                                    "SISTEMA INTEGRADO DE GESTIÓN",
                                    "AUTOCONTROL PROCEDIMIENTO",
                                    "EJECUCION DE LA FORMACION",
                                    "EJECUCIÓN DE LA FORMACIÓN",
                                    "PROYECTO FORMATIVO",
                                    "SISTEMA INTEGRADO"
                                ])
                                if is_noise: text_cell = ""
                                if text_cell:
                                    is_new_ap = re.match(r'^AP\s*\d+', text_cell) or re.match(r'^AP\s*\-', text_cell) or text_cell.startswith("ACTIVIDAD")
                                    if is_new_ap or len(text_cell) > 25:
                                        if is_new_ap:
                                            pref_match = re.match(r'^(AP\s*\d+)', text_cell)
                                            if pref_match:
                                                self.current_ap_prefix = pref_match.group(1).replace(" ", "")
                                            else:
                                                self.current_ap_prefix = None
                                                
                                            existing_ap = self.phase_activities.get(current_phase, "")
                                            if existing_ap.startswith(text_cell) or text_cell in existing_ap:
                                                pass
                                            else:
                                                self.phase_activities[current_phase] = text_cell
                                                if self.current_ap_prefix:
                                                    self.ap_full_names[self.current_ap_prefix] = text_cell
                                        elif current_phase in self.phase_activities:
                                            if text_cell not in self.phase_activities[current_phase]:
                                                joined = (self.phase_activities[current_phase] + " " + text_cell).strip()
                                                joined = joined.replace("ESTRUC ADMINISTRATIVA", "ESTRUCTURA ADMINISTRATIVA")
                                                self.phase_activities[current_phase] = joined
                                                if self.current_ap_prefix:
                                                    self.ap_full_names[self.current_ap_prefix] = joined
                                        else:
                                            self.phase_activities[current_phase] = text_cell
                                            if self.current_ap_prefix:
                                                self.ap_full_names[self.current_ap_prefix] = text_cell
                            comp_match = re.search(r'\b(\d{9})\b', " ".join(cells))
                            if comp_match: last_comp = comp_match.group(1)
                            for i in range(1, len(cells)):
                                r_match = re.search(r'\b(\d{3,7})\b', cells[i])
                                if r_match and last_comp:
                                    r_code = r_match.group(1)
                                    # Evitar falsos positivos: años sueltos (19xx/20xx) sin descripción
                                    if re.fullmatch(r'(?:19|20)\d{2}', r_code) and len(cells[i].strip()) <= 6:
                                        continue
                                    if r_code in self.global_rap_registry: continue
                                    r_desc = re.sub(r'^[\s\-–—:]+', '', cells[i].replace(r_code, "")).strip().upper()
                                    if len(r_desc) > 10:
                                        target_phase = "ETAPA_PRODUCTIVA" if last_comp == "999999999" else current_phase
                                        if target_phase == "ETAPA_PRODUCTIVA":
                                            self.phase_activities["ETAPA_PRODUCTIVA"] = cells[1].strip().upper() if len(cells) > 1 else "ETAPA PRODUCTIVA"
                                        project_act = self.phase_activities.get(target_phase, "")
                                        self._integrate(target_phase, last_comp, r_desc, r_code, project_act)
                                        self.global_rap_registry.add(r_code)
                                        self.unique_raps_codes.add(r_code)
                                        break
            for phase in self.temp_content:
                for comp in self.temp_content[phase]:
                    for rap in comp.get("learningOutcomes", []):
                        ap_text = rap.get("projectActivity", "")
                        match = re.match(r'^(AP\s*\d+)', ap_text)
                        if match:
                            prefix = match.group(1).replace(" ", "")
                            if prefix in self.ap_full_names:
                                rap["projectActivity"] = self.ap_full_names[prefix]
                                
            # sincronizar y asegurar materiales y ambiente exclusivamente en environment
            for phase in self.temp_content:
                for comp in self.temp_content[phase]:
                    for rap in comp.get("learningOutcomes", []):
                        ap_text = rap.get("projectActivity", "")
                        mats = self._get_materials_for_activity(ap_text)
                        for act in rap.get("pedagogicalActivities", []):
                            if "environment" not in act or not isinstance(act["environment"], dict):
                                act["environment"] = {"type": self.environment_description or "", "materials": mats}
                            else:
                                act["environment"]["materials"] = mats
                                if not act["environment"].get("type") and self.environment_description:
                                    act["environment"]["type"] = self.environment_description
                            # Eliminar campos obsoletos del nivel superior de la actividad
                            act.pop("materials", None)
                            act.pop("trainingMaterials", None)
                            act.pop("learningEnvironment", None)

            if self.environment_description:
                self.data["pedagogicalPlanning"]["metadata"]["environment"] = self.environment_description
            if self.general_materials:
                self.data["pedagogicalPlanning"]["metadata"]["materials"] = self.general_materials

            self._final_cleanup()
        except Exception as e: log_debug(f"[ERROR PDF 2] {e}"); self._final_cleanup()

    def _integrate(self, phase, c_code, r_desc, r_code, project_activity=""):
        if phase not in self.temp_content: self.temp_content[phase] = []
        c_info = self.competencies_data.get(c_code) or {"name": f"COMPETENCIA {c_code}", "code": c_code, "duration": 0, "concepts": [], "processes": [], "criteria": [], "academicRequirements": ""}
        c_node = next((c for c in self.temp_content[phase] if c["code"] == c_code), None)
        if not c_node:
            instr = self._get_suggested_instructor(c_code, c_info["name"])
            c_node = {
                "name": c_info["name"], "code": c_code, "totalCompetenceHours": c_info.get("duration", 0),
                "knowledge": {"conceptsAndPrinciples": c_info["concepts"], "processes": c_info["processes"]},
                "evaluationCriteria": c_info["criteria"],
                "academicRequirements": c_info.get("academicRequirements", ""),
                "learningOutcomes": [], 
                "suggestedInstructor": {"id": "", "name": instr}
            }
            self.temp_content[phase].append(c_node)
        if not any(r["description"] == r_desc for r in c_node["learningOutcomes"]):
            act_mats = self._get_materials_for_activity(project_activity)
            env_type = self.environment_description or ""
            c_node["learningOutcomes"].append({
                "description": r_desc, "evaluationCriteria": [], 
                "projectActivity": project_activity,
                "pedagogicalActivities": [{
                    "description": "", 
                    "hours": {"direct": 0, "independent": 0}, 
                    "learningEvidences": [], "didacticStrategies": [], 
                    "environment": {"type": env_type, "materials": act_mats},
                    "observations": "",
                    "suggestedInstructor": c_node["suggestedInstructor"], 
                    "scheduleDetails": {"assignedDays": [], "shift": "", "hoursPerDay": 0, "calendarNotes": ""}
                }]
            })

    def _final_cleanup(self):
        self.data["pedagogicalPlanning"]["content"] = []
        for p in ["INDUCCION", "ANALYSIS", "PLANNING", "EXECUTION", "EVALUATION", "ETAPA_PRODUCTIVA"]:
            if p in self.temp_content:
                phase_act = self.phase_activities.get(p, "ACTIVIDAD GENERAL DE LA FASE")
                self.data["pedagogicalPlanning"]["content"].append({"phase": p, "projectActivity": phase_act, "competencies": self.temp_content[p]})

    def _regex_find(self, pattern, text, default):
        m = re.search(pattern, text, re.IGNORECASE)
        return clean_cid_and_spacing(m.group(1)) if m else default

    def _clean_list(self, text):
        if not text: return []
        text = clean_cid_and_spacing(text)
        items = re.split(r'\.\s+|\n|(?<=[A-Z])\s*-\s*', text)
        cleaned = []
        for i in items:
            s = re.sub(r'^\d+(\.\d+)*\s*', '', i).strip()
            if len(s) > 2 and "Página" not in s: cleaned.append(s.upper())
        return list(dict.fromkeys(cleaned))

    def align_with_database(self):
        try:
            mongo_url = None
            env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
            if os.path.exists(env_path):
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        if line.strip().startswith('MONGO_URL='):
                            mongo_url = line.strip().split('MONGO_URL=', 1)[1]
                            break
            
            if not mongo_url:
                log_debug("[DB_ALIGN] MONGO_URL no encontrada en el archivo .env")
                return

            from pymongo import MongoClient
            client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
            db = client.get_default_database()
            
            program_code = self.data["pedagogicalPlanning"]["metadata"]["programCode"]
            fiche_number = self.data["pedagogicalPlanning"]["fiche"]
            
            log_debug(f"[DB_ALIGN] Iniciando alineación para Ficha: {fiche_number}, Programa: {program_code}")
            
            program_doc = db.programs.find_one({"code": program_code})
            if not program_doc and fiche_number:
                fiche_doc = db.fiches.find_one({"number": fiche_number})
                if fiche_doc and "program" in fiche_doc:
                    program_doc = db.programs.find_one({"_id": fiche_doc["program"]})
            
            if not program_doc:
                program_name = self.data["pedagogicalPlanning"]["metadata"]["programName"]
                if program_name:
                    program_doc = db.programs.find_one({"name": {"$regex": re.escape(program_name), "$options": "i"}})
            
            if not program_doc:
                log_debug("[DB_ALIGN] No se encontró el programa en la base de datos.")
                client.close()
                return
                
            log_debug(f"[DB_ALIGN] Programa encontrado en DB: {program_doc.get('name')} (ID: {program_doc['_id']})")
            
            db_competences = list(db.competences.find({"program": program_doc["_id"]}))
            log_debug(f"[DB_ALIGN] Se encontraron {len(db_competences)} competencias en DB.")
            
            def get_words(text):
                if not text: return set()
                text = unicodedata.normalize('NFD', text)
                text = "".join([c for c in text if unicodedata.category(c) != 'Mn'])
                text = re.sub(r'[^A-Z0-9\s]', ' ', text.upper())
                return set(w for w in text.split() if len(w) > 2)

            def get_similarity(text1, text2):
                w1 = get_words(text1)
                w2 = get_words(text2)
                if not w1 or not w2: return 0.0
                intersection = w1.intersection(w2)
                return len(intersection) / min(len(w1), len(w2))
                
            comp_count = 0
            rap_count = 0
            for phase in self.data["pedagogicalPlanning"].get("content", []):
                for comp in phase.get("competencies", []):
                    parsed_code = comp.get("code")
                    parsed_name = comp.get("name")
                    
                    best_comp = None
                    best_comp_score = 0.0
                    
                    for dbc in db_competences:
                        if str(dbc.get("number")).strip() == str(parsed_code).strip():
                            best_comp = dbc
                            best_comp_score = 1.0
                            break
                            
                    if not best_comp:
                        for dbc in db_competences:
                            score = get_similarity(parsed_name, dbc.get("name"))
                            if score > best_comp_score:
                                best_comp_score = score
                                best_comp = dbc
                                
                    if best_comp and best_comp_score >= 0.4:
                        new_code = best_comp.get("number")
                        new_name = best_comp.get("name")
                        
                        original_is_official = len(str(parsed_code).strip()) == 9
                        if str(new_code).strip() != str(parsed_code).strip() and original_is_official:
                            comp["name"] = new_name
                            log_debug(f"[DB_ALIGN] Respetando código oficial del PDF: {parsed_code} (Evitando cambiar a {new_code})")
                        else:
                            comp["code"] = new_code
                            comp["name"] = new_name
                        comp_count += 1
                        
                        db_outcomes = list(db.outcomes.find({"competence": best_comp["_id"]}))
                        
                        for rap in comp.get("learningOutcomes", []):
                            parsed_desc = rap.get("description")
                            
                            best_outcome = None
                            best_outcome_score = 0.0
                            
                            for dbo in db_outcomes:
                                score = get_similarity(parsed_desc, dbo.get("outcomes"))
                                if score > best_outcome_score:
                                    best_outcome_score = score
                                    best_outcome = dbo
                                    
                            if best_outcome and best_outcome_score >= 0.4:
                                rap["description"] = best_outcome.get("outcomes")
                                rap_count += 1
                                
            client.close()
            log_debug(f"[DB_ALIGN] Alineación finalizada. Competencias alineadas: {comp_count}, RAPs alineados: {rap_count}")
        except Exception as ex:
            log_debug(f"[DB_ALIGN] Error durante la alineación: {ex}")
            traceback.print_exc()

    def output_result(self):
        if self.data["pedagogicalPlanning"]["content"]:
            self.align_with_database()
            print("---JSON_START---")
            print(json.dumps(self.data))
            print("---JSON_END---")
        else:
            sys.stderr.write("No se pudieron extraer fases ni competencias validas de los documentos.\n")
            sys.exit(1)

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 3: sys.exit(1)
    program, project, team, fiche = args[0], args[1], (args[2] if len(args)==4 else None), (args[3] if len(args)==4 else args[2])
    ext = SenaExtractor(program, project, team, fiche)
    ext.extract_program_details(); ext.extract_team_details(); ext.extract_project_structure(); ext.output_result()
    log_debug(f"[DONE] Total RAPs: {len(ext.unique_raps_codes)}. Ficha: {ext.fiche}")