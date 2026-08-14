# RENCANA SKRIPSI: FinTrack Mentor

## 📌 Informasi Umum

**Judul**: Sistem Manajemen Keuangan Personal Berbasis Web dengan Integrasi Deep Learning untuk Kategorisasi Transaksi dan Deteksi Anomali Pengeluaran

**Program Studi**: Teknik Informatika / Ilmu Komputer

**Bidang**: Artificial Intelligence, Web Development, Financial Technology

---

## 1. RUMUSAN MASALAH

### Latar Belakang
Investor pemula sering menghadapi kesulitan dalam:
1. **Tracking pengeluaran** secara konsisten dan terstruktur
2. **Kategorisasi transaksi** yang memakan waktu dan error-prone
3. **Monitoring portofolio investasi** dengan perhitungan P/L yang akurat
4. **Deteksi pengeluaran abnormal** yang dapat mengganggu rencana keuangan
5. **Analisis keuangan** yang membutuhkan expertise finansial

### Permasalahan Spesifik
1. **Manual categorization** transaksi pengeluaran lambat dan tidak konsisten
2. **Tidak ada sistem peringatan dini** untuk pengeluaran yang tidak biasa
3. **Perhitungan portofolio** (avg price, P/L, drawdown) kompleks dan rentan kesalahan
4. **Akses informasi finansial** memerlukan konsultasi yang mahal
5. **Data keuangan tersebar** di berbagai platform tanpa agregasi

---

## 2. PERTANYAAN PENELITIAN

1. Bagaimana merancang sistem web yang dapat **mengotomasi kategorisasi transaksi pengeluaran** menggunakan deep learning?
2. Seberapa akurat model **IndoBERT fine-tuned** dalam mengklasifikasikan kategori pengeluaran berbahasa Indonesia?
3. Bagaimana **autoencoder** dapat mendeteksi anomali pengeluaran berdasarkan pola historis user?
4. Bagaimana integrasi **ChatGPT dengan function calling** dapat memberikan analisis finansial yang relevan dan actionable?
5. Bagaimana sistem dapat menghitung **portfolio metrics** (avg price, unrealized/realized P/L, drawdown) secara real-time?

---

## 3. TUJUAN PENELITIAN

### Tujuan Umum
Membangun sistem manajemen keuangan personal berbasis web yang dapat membantu investor pemula dalam tracking pengeluaran, monitoring portofolio investasi, dan mendapatkan insights finansial melalui AI chatbot.

### Tujuan Khusus
1. **Mengimplementasikan model deep learning** (IndoBERT) untuk kategorisasi transaksi pengeluaran dengan akurasi minimal 80%
2. **Mengembangkan sistem deteksi anomali** menggunakan autoencoder untuk mendeteksi pengeluaran tidak biasa
3. **Membangun API RESTful** dengan FastAPI untuk manajemen data keuangan
4. **Mengintegrasikan ChatGPT** dengan function calling untuk analisis keuangan interaktif
5. **Mengimplementasikan perhitungan finansial** yang akurat (avg price, P/L, drawdown, dividen)
6. **Mengevaluasi performa sistem** dari segi akurasi model, response time, dan user experience

---

## 4. BATASAN PENELITIAN

### Batasan Fungsional
1. **Fokus pada saham Indonesia** (tidak termasuk crypto, reksadana, obligasi)
2. **Update harga saham manual** (belum realtime API seperti Yahoo Finance/IDX)
3. **Bahasa Indonesia & English** untuk UI
4. **Kategori pengeluaran terbatas** pada 8 kategori utama
5. **Single currency** (IDR only)

### Batasan Teknis
1. **Dataset training terbatas** pada synthetic + user-generated data
2. **Model deployment** di single server (belum distributed)
3. **Rate limiting** untuk ChatGPT API calls
4. **Tidak termasuk PII encryption** (hanya hashing password)

### Batasan Non-Fungsional
1. **Target users**: Investor pemula (umur 20-35 tahun)
2. **Device support**: Desktop & mobile web (responsive)
3. **Browser compatibility**: Modern browsers (Chrome, Firefox, Safari)

---

## 5. MANFAAT PENELITIAN

### Manfaat Teoritis
1. **Kontribusi riset** pada aplikasi NLP untuk financial text classification (bahasa Indonesia)
2. **Evaluasi komparatif** antara baseline (TF-IDF + Logistic Regression) vs deep learning (IndoBERT)
3. **Studi kasus** implementasi autoencoder untuk anomaly detection pada data finansial personal

### Manfaat Praktis
1. **Efisiensi waktu** dalam kategorisasi transaksi (otomatis vs manual)
2. **Peningkatan awareness** finansial melalui anomaly alerts
3. **Akurasi perhitungan** portofolio untuk decision making
4. **Akses insights** finansial 24/7 melalui AI chatbot
5. **Open-source codebase** untuk edukasi dan development

---

## 6. METODOLOGI PENELITIAN

### A. Desain Penelitian
**Jenis**: Applied Research dengan pendekatan Agile Development

**Metode**: 
- Quantitative (evaluasi akurasi model, response time)
- Qualitative (user experience survey)

### B. Tahapan Penelitian

#### Phase 1: Requirement Analysis & Design (Week 1-2)
- [ ] Literature review: expense categorization, anomaly detection, portfolio management
- [ ] Analisis kebutuhan user (interview 10-15 investor pemula)
- [ ] Design database schema
- [ ] Design system architecture
- [ ] Create wireframes & UI mockups

**Output**: 
- System requirements document
- Database ERD
- UI/UX design (Figma)

#### Phase 2: Backend Development (Week 3-5)
- [ ] Setup FastAPI + PostgreSQL + Alembic
- [ ] Implement authentication (JWT + bcrypt)
- [ ] Implement CRUD API (expenses, portfolio, daily reports)
- [ ] Implement financial calculations module
- [ ] Write unit tests

**Output**: 
- Working REST API with Swagger docs
- Test coverage >80%

#### Phase 3: ML/DL Model Development (Week 6-8)
- [ ] Collect & prepare dataset (500+ labeled expenses)
- [ ] Train baseline model (TF-IDF + Logistic Regression)
- [ ] Fine-tune IndoBERT for expense categorization
- [ ] Train autoencoder for anomaly detection
- [ ] Evaluate models (accuracy, F1, confusion matrix)
- [ ] Deploy models via API

**Output**: 
- Trained models with evaluation metrics
- ML inference API endpoints

#### Phase 4: Frontend Development (Week 9-10)
- [ ] Setup React + TypeScript + TailwindCSS
- [ ] Implement authentication UI
- [ ] Implement expense tracking UI
- [ ] Implement portfolio management UI
- [ ] Implement daily report UI
- [ ] Integrate with backend API

**Output**: 
- Responsive web application

#### Phase 5: ChatGPT Integration (Week 11)
- [ ] Setup OpenAI API
- [ ] Implement function calling (tools)
- [ ] Design chatbot conversation flow
- [ ] Integrate with frontend chat UI
- [ ] Test chatbot responses

**Output**: 
- AI-powered chatbot with tool calling

#### Phase 6: Testing & Evaluation (Week 12-13)
- [ ] Unit testing (backend calculations)
- [ ] Integration testing (API endpoints)
- [ ] ML model evaluation on test set
- [ ] User acceptance testing (10 users)
- [ ] Performance testing (load, response time)
- [ ] Security testing (OWASP Top 10)

**Output**: 
- Test reports
- Bug fixes
- Performance metrics

#### Phase 7: Deployment & Documentation (Week 14-15)
- [ ] Setup Docker containers
- [ ] Deploy to cloud (AWS/GCP/Azure)
- [ ] Setup monitoring (logs, errors)
- [ ] Write API documentation
- [ ] Write user manual
- [ ] Create demo video

**Output**: 
- Production-ready application
- Complete documentation

#### Phase 8: Thesis Writing (Week 16-18)
- [ ] Write chapters 1-3 (intro, literature, methodology)
- [ ] Write chapter 4 (implementation & results)
- [ ] Write chapter 5 (evaluation & discussion)
- [ ] Write chapter 6 (conclusion & future work)
- [ ] Prepare presentation slides
- [ ] Rehearse defense

**Output**: 
- Complete thesis document
- Defense presentation

---

## 7. METRIK EVALUASI

### A. Machine Learning Metrics

#### Expense Categorization Model
| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Accuracy** | ≥ 80% | Correct predictions / Total predictions |
| **Macro F1 Score** | ≥ 0.75 | Harmonic mean of precision & recall across categories |
| **Per-class Precision** | ≥ 0.70 | TP / (TP + FP) per category |
| **Per-class Recall** | ≥ 0.70 | TP / (TP + FN) per category |
| **Inference Time** | < 100ms | Average time per prediction |

**Baseline Comparison**:
- TF-IDF + Logistic Regression vs IndoBERT
- Expected improvement: +10-15% accuracy

#### Anomaly Detection Model
| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Precision** | ≥ 0.60 | True anomalies / Detected anomalies |
| **Recall** | ≥ 0.70 | Detected anomalies / True anomalies |
| **F1 Score** | ≥ 0.65 | Harmonic mean of precision & recall |
| **False Positive Rate** | ≤ 10% | FP / (FP + TN) |

**Evaluation Method**:
- Inject synthetic anomalies (5x avg amount, unusual time)
- Measure detection rate

### B. System Performance Metrics

| Metric | Target | Tool |
|--------|--------|------|
| **API Response Time** | < 200ms | Apache Bench, Locust |
| **Database Query Time** | < 50ms | PostgreSQL EXPLAIN ANALYZE |
| **Concurrent Users** | ≥ 100 | Load testing (Locust) |
| **Uptime** | ≥ 99.5% | Monitoring (Prometheus) |
| **Error Rate** | < 1% | API logs |

### C. Accuracy of Financial Calculations

**Test Cases**:
1. **Avg Price Calculation**
   - Input: 3 buy transactions with different prices & fees
   - Expected: Weighted average including fees
   - Tolerance: ±0.01 IDR

2. **Unrealized P/L Calculation**
   - Input: Holdings with current prices
   - Expected: (Current - Avg) × Shares
   - Tolerance: ±1 IDR

3. **Realized P/L (FIFO)**
   - Input: Multiple buy + 1 sell transaction
   - Expected: FIFO matching
   - Tolerance: ±1 IDR

4. **Drawdown Calculation**
   - Input: Daily portfolio values
   - Expected: (Peak - Current) / Peak × 100%
   - Tolerance: ±0.01%

5. **Dividend Calculation**
   - Input: Div per share × shares on record date
   - Expected: Total dividend
   - Tolerance: ±1 IDR

### D. User Experience Metrics

**Survey Questions** (1-5 Likert Scale):
1. Ease of use in tracking expenses
2. Usefulness of automatic categorization
3. Clarity of portfolio calculations
4. Helpfulness of anomaly alerts
5. Quality of chatbot responses
6. Overall satisfaction

**Target**: Average score ≥ 4.0/5.0

**Usability Testing**:
- Task completion rate: ≥ 90%
- Time to complete core tasks: < 5 minutes
- Number of errors: < 2 per session

---

## 8. SKENARIO PENGUJIAN

### Skenario 1: Expense Categorization Accuracy
**Objective**: Validate ML model accuracy

**Steps**:
1. Prepare test dataset (100 labeled expenses)
2. Run inference on all test samples
3. Compare predictions vs ground truth
4. Calculate accuracy, F1, confusion matrix

**Expected Results**:
- Accuracy ≥ 80%
- Macro F1 ≥ 0.75
- No category with F1 < 0.60

### Skenario 2: Anomaly Detection
**Objective**: Test anomaly detection sensitivity

**Steps**:
1. Create normal expense profile (30 days)
2. Inject 10 anomalies:
   - 5x average amount
   - Unusual time (3 AM)
   - New merchant with high amount
3. Run anomaly detection
4. Measure precision, recall, F1

**Expected Results**:
- Detect ≥ 7/10 anomalies (Recall ≥ 70%)
- False positives ≤ 3 (Precision ≥ 60%)

### Skenario 3: Portfolio Calculation Accuracy
**Objective**: Verify financial calculations

**Test Cases**:
1. **Avg Price**: 
   - Buy 100 BBCA @ 10,000 (fee 25,000)
   - Buy 200 BBCA @ 9,500 (fee 30,000)
   - Expected Avg: (1,000,000 + 25,000 + 1,900,000 + 30,000) / 300 = 9,850

2. **Unrealized P/L**:
   - Avg Price: 9,850
   - Current Price: 10,500
   - Shares: 300
   - Expected P/L: (10,500 - 9,850) × 300 = 195,000

3. **Drawdown**:
   - Peak: 1,500,000
   - Current: 1,350,000
   - Expected: (1,500,000 - 1,350,000) / 1,500,000 = 10%

**Pass Criteria**: All calculations within ±0.1% tolerance

### Skenario 4: ChatGPT Tool Calling
**Objective**: Test AI chatbot integration

**Test Queries**:
1. "Bagaimana portofolio saya?"
   - Expected: Call `get_portfolio_summary()` tool
   - Return portfolio metrics

2. "Analisis pengeluaran bulan ini"
   - Expected: Call `get_expense_summary()` tool
   - Return expense breakdown

3. "Apakah ada pengeluaran yang tidak wajar?"
   - Expected: Call `get_anomalies()` tool
   - Return anomaly list

**Pass Criteria**: 
- Correct tool called: 100%
- Relevant response: ≥ 90% (manual evaluation)

### Skenario 5: System Performance
**Objective**: Test system under load

**Load Test**:
- Concurrent users: 100
- Duration: 10 minutes
- Operations: Create expense, view portfolio, chat query

**Expected Results**:
- Average response time: < 200ms
- 95th percentile: < 500ms
- Error rate: < 1%
- No crashes or timeouts

### Skenario 6: Security Testing
**Objective**: Validate authentication & authorization

**Tests**:
1. **Unauthenticated access**: Should return 401
2. **Invalid JWT**: Should return 401
3. **Expired token**: Should return 401 + refresh flow
4. **SQL Injection**: Parameterized queries should prevent
5. **XSS**: Input sanitization should prevent

**Pass Criteria**: All security tests pass (0 vulnerabilities)

---

## 9. DATASET

### A. Expense Dataset

**Source**:
1. **Synthetic generation** (300 samples)
   - Indonesian merchant names
   - Realistic amounts per category
   - Date distribution

2. **User-generated** (200+ samples)
   - Real transactions from test users
   - Manually labeled categories

**Categories** (8):
- Makan
- Transport
- Belanja
- Tagihan
- Hiburan
- Kesehatan
- Pendidikan
- Lainnya

**Features**:
- merchant (text)
- amount (numeric)
- day_of_week (categorical)
- hour (numeric, optional)

**Split**:
- Training: 70% (350 samples)
- Validation: 15% (75 samples)
- Test: 15% (75 samples)

### B. Anomaly Dataset

**Normal Data**:
- 30 days of regular expenses per user
- Typical amounts per category
- Consistent patterns

**Anomaly Data**:
- Injected anomalies:
  - High amount (3-5x average)
  - Unusual time (late night/early morning)
  - New merchant with high first transaction
  - Sudden spike in category spending

**Ratio**: 95% normal, 5% anomalies (realistic imbalance)

---

## 10. TOOLS & TEKNOLOGI

### Development
- **Code Editor**: VS Code
- **Version Control**: Git + GitHub
- **API Testing**: Postman / Insomnia
- **Database Client**: DBeaver / pgAdmin

### Backend
- **Language**: Python 3.10+
- **Framework**: FastAPI 0.100+
- **Database**: PostgreSQL 15
- **ORM**: SQLAlchemy 2.0
- **Migration**: Alembic
- **Testing**: Pytest
- **Async**: asyncio + asyncpg

### Frontend
- **Language**: TypeScript 5.0+
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS 4.0
- **Charts**: Recharts
- **HTTP Client**: Axios / Fetch
- **State Management**: Context API
- **Routing**: React Router v6

### Machine Learning
- **Framework**: PyTorch 2.0
- **Transformers**: Hugging Face Transformers
- **Preprocessing**: Pandas, NumPy
- **Visualization**: Matplotlib, Seaborn
- **Baseline ML**: Scikit-learn

### AI/LLM
- **Provider**: OpenAI GPT-4
- **Library**: openai-python

### DevOps
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Hosting**: AWS EC2 / Google Cloud Run
- **Monitoring**: Prometheus + Grafana (optional)

---

## 11. TIMELINE

| Week | Fase | Deliverable |
|------|------|-------------|
| 1-2 | Requirement & Design | System design, DB schema, Wireframes |
| 3-5 | Backend Development | REST API, Auth, CRUD, Tests |
| 6-8 | ML/DL Development | Trained models, Evaluation report |
| 9-10 | Frontend Development | React app, UI components |
| 11 | ChatGPT Integration | AI chatbot with tools |
| 12-13 | Testing & Evaluation | Test reports, Performance metrics |
| 14-15 | Deployment | Docker, Cloud deployment, Docs |
| 16-18 | Thesis Writing | Complete thesis document, Defense slides |

**Total Duration**: 18 weeks (≈ 4.5 months)

---

## 12. KONTRIBUSI PENELITIAN

### Kontribusi Ilmiah
1. **Dataset**: Expense transaction dataset berbahasa Indonesia (open-sourced)
2. **Benchmark**: Perbandingan baseline vs deep learning untuk financial text classification
3. **Case Study**: Implementasi autoencoder untuk personal finance anomaly detection

### Kontribusi Praktis
1. **Open-source application**: Full-stack financial management app
2. **Best practices**: FastAPI + React + ML deployment pattern
3. **Educational resource**: Code examples untuk learning

---

## 13. REFERENSI (Preliminary)

### Deep Learning & NLP
1. Devlin, J., et al. (2018). BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding.
2. Wilie, B., et al. (2020). IndoNLU: Benchmark and Resources for Evaluating Indonesian Natural Language Understanding.

### Anomaly Detection
3. Chandola, V., Banerjee, A., & Kumar, V. (2009). Anomaly detection: A survey. ACM computing surveys (CSUR).
4. Zhou, C., & Paffenroth, R. C. (2017). Anomaly detection with robust deep autoencoders.

### Financial Applications
5. Chen, J., et al. (2020). Personal Financial Management Apps: A Survey. IEEE Access.
6. Suhartono, et al. (2021). Indonesian Stock Market Prediction using LSTM. ICAICTA.

### Software Engineering
7. Ramalho, L. (2022). Fluent Python: Clear, Concise, and Effective Programming.
8. Gamma, E., et al. (1994). Design Patterns: Elements of Reusable Object-Oriented Software.

---

## 14. EXPECTED OUTCOMES

### Minimum Viable Product (MVP)
✅ Working web application with:
- User authentication
- Expense tracking with ML categorization
- Portfolio management with accurate calculations
- Daily report & equity curve
- AI chatbot with basic queries

### Target Outcomes
✅ MVP + Enhanced features:
- Anomaly detection with alerts
- ChatGPT tool calling integration
- Comprehensive testing (>80% coverage)
- Production deployment
- Complete documentation

### Stretch Goals
🎯 If time permits:
- Real-time stock price integration (Yahoo Finance API)
- Mobile app (React Native)
- Advanced analytics (predictions, recommendations)
- Multi-currency support
- Export to PDF reports

---

## 15. RISK MITIGATION

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Dataset terlalu kecil | Medium | High | Generate synthetic data, crowdsource labels |
| Model accuracy < target | Medium | High | Try different architectures, ensemble methods |
| API rate limits (ChatGPT) | High | Medium | Implement caching, fallback responses |
| Cloud hosting cost | Low | Medium | Use free tier, optimize resources |
| Scope creep | High | High | Strict MVP definition, backlog prioritization |
| Technical debt | Medium | Medium | Code reviews, refactoring sprints |

---

**Document Version**: 1.0
**Last Updated**: January 20, 2026
**Author**: [Your Name]
**Supervisor**: [Supervisor Name]
