<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marketing Report v24 - Smart Tables & Auto-split</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        /* ==========================================================================
           1. HỆ THỐNG MÀU SẮC & BIẾN CƠ BẢN
           ========================================================================== */
        :root {
            --primary: #f97316;
            --primary-dark: #ea580c;
            --primary-light: #ffedd5;
            --navy: #0f172a;
            --navy-light: #1e293b;
            --slate-100: #f1f5f9;
            --slate-200: #e2e8f0;
            --text-main: #334155;
            --text-muted: #64748b;
            --white: #ffffff;
            --success: #10b981;
            --danger: #ef4444;
            --zoom: 1;
        }

        * { box-sizing: border-box; }
        body {
            background-color: #f1f5f9;
            background-image: 
                radial-gradient(at 0% 0%, hsla(28, 100%, 74%, 0.15) 0px, transparent 50%),
                radial-gradient(at 100% 0%, hsla(210, 100%, 80%, 0.15) 0px, transparent 50%);
            background-attachment: fixed;
            margin: 0; padding: 40px 0;
            display: flex; flex-direction: column; align-items: center;
            font-family: 'Be Vietnam Pro', sans-serif; color: var(--navy);
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        /* ==========================================================================
           2. TỐI ƯU IN PDF 16:9
           ========================================================================== */
        @media print {
            body { 
                background: white !important; padding: 0 !important; margin: 0 !important; 
                -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
                background-image: none !important;
            }
            .no-print { display: none !important; }
            #zoom-wrapper { transform: none !important; padding: 0 !important; margin: 0 !important; gap: 0 !important; }
            .slide-section {
                width: 1280px !important; height: 720px !important; 
                box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; border: none !important;
                page-break-after: always !important; page-break-inside: avoid !important;
                position: relative !important; transform: none !important;
            }
            @page { size: 1280px 720px; margin: 0; }
            .slide-section::before { display: none !important; }
        }

        /* ==========================================================================
           3. UI CONTROLS (TOOLBAR & ZOOM)
           ========================================================================== */
        .controls-wrapper {
            position: fixed; top: 25px; right: 25px; z-index: 10000;
            display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
        }
        .main-toolbar {
            background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px);
            padding: 20px 24px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.12); 
            display: flex; flex-direction: column; gap: 12px;
            border: 1px solid rgba(255,255,255,1); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            transform-origin: top right; width: 280px;
        }
        .main-toolbar.hidden { transform: scale(0.8); opacity: 0; pointer-events: none; }
        
        .toggle-btn {
            width: 50px; height: 50px; border-radius: 50%; background: var(--primary); color: white;
            border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 10px 25px rgba(249, 115, 22, 0.3); font-size: 20px; transition: 0.3s;
        }
        .toggle-btn:hover { transform: scale(1.05); background: var(--primary-dark); }

        .btn {
            width: 100%; padding: 12px 16px; border-radius: 12px; border: none; font-family: 'Be Vietnam Pro';
            font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 13px;
            transition: 0.2s;
        }
        .btn-new { background: var(--success); color: white; }
        .btn-new:hover { box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4); transform: translateY(-1px); }
        .btn-save { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; }
        .btn-save:hover { box-shadow: 0 5px 15px rgba(249, 115, 22, 0.4); transform: translateY(-1px); }
        .btn-pdf { background: var(--navy); color: white; }
        .btn-pdf:hover { background: var(--navy-light); }
        
        /* Auto-save Status */
        .status-box {
            background: var(--slate-100); padding: 12px; border-radius: 12px; text-align: center;
            border: 1px solid var(--slate-200);
        }
        .auto-save-indicator { font-size: 11px; font-weight: 700; color: var(--text-muted); transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 6px;}
        .auto-save-indicator.active { color: var(--success); }
        .auto-save-indicator.saving { color: var(--primary); }

        /* ==========================================================================
           4. SIDEBAR LỊCH SỬ (KHO BÁO CÁO)
           ========================================================================== */
        .history-sidebar {
            position: fixed; left: 0; top: 0; width: 300px; height: 100vh; background: var(--navy);
            color: white; padding: 35px 20px; z-index: 9999; transform: translateX(-100%); transition: 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex; flex-direction: column;
        }
        .sidebar-tab {
            position: absolute; right: -45px; top: 25px; width: 45px; height: 50px;
            background: var(--navy); border-radius: 0 12px 12px 0; color: white;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 5px 0 15px rgba(0,0,0,0.2); font-size: 20px; transition: 0.3s; cursor: pointer;
        }
        .history-sidebar:hover { transform: translateX(0); box-shadow: 20px 0 50px rgba(0,0,0,0.5); }
        .history-sidebar:hover .sidebar-tab { opacity: 0; }
        
        .history-title { color: var(--primary); font-weight: 800; font-size: 15px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; padding-left: 10px;}
        .report-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; flex-grow: 1; display: flex; flex-direction: column; gap: 8px;}
        
        .report-item { 
            background: rgba(255,255,255,0.05); border-radius: 12px; 
            border-left: 4px solid transparent; transition: 0.2s; color: rgba(255,255,255,0.8);
            display: flex; align-items: stretch; overflow: hidden;
        }
        .report-info {
            flex-grow: 1; padding: 12px 15px; cursor: pointer; display: flex; flex-direction: column; gap: 4px;
        }
        .report-info .r-name { font-size: 13px; font-weight: 700; }
        .report-info .r-time { font-size: 11px; opacity: 0.6; display: flex; align-items: center; gap: 5px; font-weight: 500;}
        
        .report-item:hover { background: rgba(255,255,255,0.1); color: white; border-left-color: rgba(255,255,255,0.3);}
        .report-item.active { background: var(--primary); color: white; border-left-color: white; font-weight: 700; box-shadow: 0 5px 15px rgba(249,115,22,0.3);}
        .report-item.active .r-time { opacity: 0.9; }

        .btn-del-report {
            background: transparent; color: rgba(255,255,255,0.3); border: none; padding: 0 15px; cursor: pointer; transition: 0.2s;
            display: flex; align-items: center; justify-content: center;
        }
        .btn-del-report:hover { background: var(--danger); color: white; }

        /* ==========================================================================
           5. SLIDE & COMPONENTS
           ========================================================================== */
        #zoom-wrapper {
            transform: scale(var(--zoom)); transform-origin: top center;
            display: flex; flex-direction: column; gap: 60px; align-items: center; width: 100%;
            padding-bottom: 200px; transition: transform 0.2s ease-out;
        }

        .slide-section {
            width: 1280px; height: 720px; background: white; position: relative; overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.15);
            display: flex; flex-direction: column; padding: 70px 90px; flex-shrink: 0; border-radius: 24px;
        }
        .slide-section::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 8px;
            background: linear-gradient(90deg, var(--primary), var(--primary-dark));
        }

        /* Vùng nội dung để đo chiều cao tự ngắt slide */
        .slide-content-area {
            flex-grow: 1; display: flex; flex-direction: column; width: 100%;
        }

        /* BÌA */
        .hero-slide {
            padding: 0; justify-content: center; align-items: center;
            background-size: cover; background-position: center;
            background-image: url('https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1280&q=80');
        }
        .hero-slide::after {
            content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.35); z-index: 1; pointer-events: none;
        }
        .hero-content {
            position: relative; z-index: 2;
            background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
            padding: 75px 100px; border-radius: 40px; text-align: center;
            box-shadow: 0 30px 60px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.3); 
            max-width: 900px; color: white;
        }
        .hero-content h3 { margin: 0; letter-spacing: 5px; font-weight: 700; color: rgba(255,255,255,0.8); font-size: 18px; text-transform: uppercase; margin-bottom: 25px;}
        .hero-content h1 { font-size: 88px; font-weight: 900; margin: 0; line-height: 1; color: white; letter-spacing: -2px;}
        .hero-content p { color: var(--primary-light); font-size: 22px; font-weight: 700; letter-spacing: 6px; margin-top: 35px; text-transform: uppercase; }

        .slide-title {
            font-size: 40px; font-weight: 800; margin-bottom: 30px; color: var(--navy);
            text-transform: uppercase; line-height: 1.2; position: relative; padding-bottom: 15px;
        }
        .slide-title::after {
            content: ''; position: absolute; bottom: 0; left: 0; width: 80px; height: 6px;
            background: var(--primary); border-radius: 3px;
        }

        /* THẺ NGÂN SÁCH ĐẸP MẮT (Linh hoạt cho việc chèn thêm) */
        .budget-grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(45%, 1fr)); 
            gap: 20px; margin-top: 10px; align-content: start; flex-grow: 1;
        }
        .budget-card {
            background: var(--white); border-radius: 20px; padding: 25px 30px;
            display: flex; flex-direction: column; justify-content: center;
            position: relative; border: 1px solid var(--slate-200); box-shadow: 0 10px 30px rgba(0,0,0,0.03);
            transition: 0.3s;
        }
        .budget-card:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(0,0,0,0.08); border-color: var(--primary-light);}
        .budget-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; border-radius: 20px 0 0 20px;}
        
        /* Auto color assign based on nth-child */
        .budget-card:nth-child(4n+1)::before { background: var(--primary); }
        .budget-card:nth-child(4n+2)::before { background: var(--navy); }
        .budget-card:nth-child(4n+3)::before { background: var(--success); }
        .budget-card:nth-child(4n+4)::before { background: var(--danger); }
        
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .budget-card .label { font-size: 14px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; width: 85%;}
        
        .budget-card .amount { 
            font-size: 44px; font-weight: 800; color: var(--navy); 
            letter-spacing: -1px; line-height: 1; border: none; background: transparent; width: 100%;
            font-feature-settings: "tnum"; 
        }
        .budget-card:nth-child(4n+3) .amount { color: var(--success); }
        .budget-card:nth-child(4n+4) .amount { color: var(--danger); }
        .budget-card:nth-child(4n+1) .amount { color: var(--primary-dark); }

        /* BẢNG BIỂU (TABLES) CHUYÊN NGHIỆP */
        .table-wrapper {
            position: relative; width: 100%; margin-top: 10px; border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05); border: 1px solid var(--slate-200); background: white;
        }
        .custom-table {
            width: 100%; border-collapse: collapse; font-size: 16px; text-align: left;
        }
        .custom-table th, .custom-table td {
            padding: 15px 20px; border-bottom: 1px solid var(--slate-200);
            border-right: 1px solid var(--slate-200);
        }
        .custom-table th:last-child, .custom-table td:last-child { border-right: none; }
        .custom-table thead tr { background-color: var(--navy); color: white; }
        .custom-table th { font-weight: 700; text-transform: uppercase; font-size: 14px; letter-spacing: 0.5px;}
        .custom-table tbody tr:hover { background-color: #f8fafc; }
        
        /* Table controls */
        .table-controls {
            position: absolute; top: -45px; right: 0; display: flex; gap: 8px;
            opacity: 0; transition: 0.3s;
        }
        .table-wrapper:hover .table-controls { opacity: 1; }
        .slide-section.idle .table-controls { opacity: 0 !important; pointer-events: none; }
        .tc-btn {
            background: white; border: 1px solid var(--primary); color: var(--primary); padding: 5px 12px;
            border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Be Vietnam Pro';
            box-shadow: 0 2px 5px rgba(249, 115, 22, 0.2); transition: 0.2s;
        }
        .tc-btn:hover { background: var(--primary); color: white; }
        .tc-btn.del { border-color: var(--danger); color: var(--danger); box-shadow: 0 2px 5px rgba(239, 68, 68, 0.2); }
        .tc-btn.del:hover { background: var(--danger); color: white; }

        /* 6. TƯƠNG TÁC CHUNG */
        [contenteditable="true"] { outline: none; transition: 0.2s; padding: 2px 4px; margin: -2px -4px; border-radius: 4px; }
        [contenteditable="true"]:hover { background: rgba(249, 115, 22, 0.05); }
        [contenteditable="true"]:focus { background: rgba(249, 115, 22, 0.1); box-shadow: inset 0 0 0 2px var(--primary); }
        
        .slide-actions { position: absolute; top: 25px; right: 25px; display: flex; gap: 8px; opacity: 0; transition: 0.4s ease; z-index: 1000;}
        .edit-overlay { position: absolute; top: 25px; left: 25px; background: rgba(15,23,42,0.7); backdrop-filter: blur(10px); color: white; border: none; padding: 10px 20px; border-radius: 30px; font-size: 13px; cursor: pointer; font-weight: 700; opacity: 0; transition: 0.4s ease; z-index: 1000; display: flex; align-items: center; gap: 8px;}
        .edit-overlay:hover { background: var(--primary); }

        .slide-section:hover .slide-actions, .slide-section:hover .edit-overlay { opacity: 1; transform: translateY(0); }
        .slide-section.idle .slide-actions, .slide-section.idle .edit-overlay { opacity: 0 !important; pointer-events: none !important; transform: translateY(-5px); }

        .act-btn { 
            width: 40px; height: 40px; border-radius: 50%; border: none; background: white;
            cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; font-size: 14px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08); transition: 0.2s; border: 1px solid var(--slate-200);
        }
        .act-btn:hover { background: var(--primary); color: white; border-color: var(--primary); transform: scale(1.05); }
        .act-btn.del { color: var(--danger); }
        .act-btn.del:hover { background: var(--danger); color: white; border-color: var(--danger); }

        .slide-app-full { padding: 0 !important; border: none !important; background: white !important; }
        .slide-app-full::before { display: none !important; }
        .app-iframe-container { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; overflow: hidden; z-index: 1; }
        .app-iframe-container iframe { width: 100%; height: 100%; border: none; pointer-events: auto; display: block; }
        
        .drive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; width: 100%; flex-grow: 1; overflow-y: auto; padding: 10px; align-content: start;}
        .drive-box { border-radius: 16px; overflow: hidden; height: 240px; position: relative; border: 1px solid var(--slate-200); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
        .drive-box img { width: 100%; height: 100%; object-fit: cover; }
    </style>
</head>
<body>

    <!-- LỊCH SỬ BÁO CÁO -->
    <div class="history-sidebar no-print">
        <div class="sidebar-tab"><i class="fa-solid fa-clock-rotate-left"></i></div>
        <div class="history-title"><i class="fa-solid fa-layer-group"></i> KHO BÁO CÁO CỦA BẠN</div>
        <ul class="report-list" id="report-history">
            <li class="report-item" style="opacity:0.5; justify-content:center;">Đang tải dữ liệu...</li>
        </ul>
    </div>

    <!-- BẢNG ĐIỀU KHIỂN CHÍNH -->
    <div class="controls-wrapper no-print">
        <div class="main-toolbar hidden" id="main-menu">
            <h4 style="margin:0 0 5px 0; font-size:14px; font-weight:800; color:var(--navy); text-transform:uppercase;">Control Panel</h4>
            
            <div class="status-box">
                <label style="font-size:10px; font-weight:800; color:var(--text-muted); display:block; margin-bottom:8px; text-transform:uppercase;">Thu phóng Slide: <span id="zoom-txt" style="color:var(--primary);">100%</span></label>
                <input type="range" min="0.3" max="1.5" step="0.05" value="1" style="width:100%; accent-color:var(--primary);" id="zoom-range">
            </div>

            <!-- Nút TẠO BÁO CÁO MỚI được thêm vào đây -->
            <button class="btn btn-new" onclick="createNewReportTemplate()"><i class="fa-solid fa-file-medical"></i> TẠO BÁO CÁO MỚI (TRẮNG)</button>
            <button class="btn btn-save" onclick="handleSaveRequest()"><i class="fa-solid fa-cloud-arrow-up"></i> LƯU BÁO CÁO</button>
            <button class="btn btn-pdf" onclick="window.print()"><i class="fa-solid fa-file-pdf"></i> XUẤT FILE PDF</button>
            
            <div class="auto-save-indicator" id="auto-save-text">
                <i class="fa-solid fa-circle-info"></i> Lưu báo cáo lần đầu để bật Tự Động Lưu
            </div>
            
            <hr style="width:100%; border:none; border-top:1px solid #f1f5f9; margin:0;">
            <div style="display:flex; gap:8px;">
                <button class="btn" style="background:var(--white); border:1px solid var(--slate-200); color:var(--navy); padding:10px;" onclick="addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-plus"></i> Slide</button>
                <button class="btn" style="background:var(--white); border:1px solid var(--slate-200); color:var(--navy); padding:10px;" onclick="addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-link"></i> App</button>
            </div>
        </div>
        <button class="toggle-btn" onclick="document.getElementById('main-menu').classList.toggle('hidden')">
            <i class="fa-solid fa-sliders"></i>
        </button>
    </div>

    <!-- KHU VỰC TRÌNH BÀY -->
    <div id="zoom-wrapper">
        <div id="deck-container" style="display: flex; flex-direction: column; gap: 70px; align-items: center; width: 100%;">

            <!-- SLIDE 1: BÌA -->
            <div class="slide-section hero-slide" id="slide-1">
                <button class="edit-overlay no-print" onclick="changeHeroBg(this)">
                    <i class="fa-solid fa-camera"></i> Đổi ảnh nền
                </button>
                <div class="slide-actions no-print">
                    <button class="act-btn" onclick="addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-file-circle-plus"></i></button>
                    <button class="act-btn" onclick="addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-object-group"></i></button>
                </div>
                
                <div class="hero-content">
                    <h3 contenteditable="true">BÁO CÁO HOẠT ĐỘNG MARKETING</h3>
                    <h1 contenteditable="true">THE WIN CITY</h1>
                    <p contenteditable="true">Tuần: 20/04/2026 – 26/04/2026</p>
                </div>
            </div>

            <!-- SLIDE 2: NGÂN SÁCH -->
            <div class="slide-section" id="slide-2">
                <div class="slide-actions no-print">
                    <button class="act-btn" style="color:var(--success);" onclick="addBudgetCard(this)" title="Thêm thẻ ngân sách"><i class="fa-solid fa-plus"></i></button>
                    <button class="act-btn" onclick="addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-file-circle-plus"></i></button>
                    <button class="act-btn" onclick="addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-object-group"></i></button>
                    <button class="act-btn del" onclick="this.closest('.slide-section').remove()" title="Xóa Slide"><i class="fa-solid fa-trash-can"></i></button>
                </div>
                
                <h2 class="slide-title" contenteditable="true">BÁO CÁO NGÂN SÁCH CHI TIẾT</h2>
                <div class="slide-content-area">
                    <div class="budget-grid">
                        <div class="budget-card card-approved">
                            <div class="card-header"><span class="label" contenteditable="true">Ngân sách được duyệt</span></div>
                            <div class="amount auto-format" contenteditable="true">65.000.000.000</div>
                        </div>
                        <div class="budget-card card-signed">
                            <div class="card-header"><span class="label" contenteditable="true">Giá trị hợp đồng đã ký</span></div>
                            <div class="amount auto-format" contenteditable="true">39.028.549.837</div>
                        </div>
                        <div class="budget-card card-remain">
                            <div class="card-header"><span class="label" contenteditable="true">Ngân sách còn lại (Dự phòng)</span></div>
                            <div class="amount auto-format" contenteditable="true">24.997.017.363</div>
                        </div>
                        <div class="budget-card card-spent">
                            <div class="card-header"><span class="label" contenteditable="true">Đang giải ngân (Số dư HĐ)</span></div>
                            <div class="amount auto-format" contenteditable="true">05.525.366.190</div>
                        </div>
                    </div>
                </div>
                <p contenteditable="true" style="margin-top:20px; font-size:13px; color:var(--text-muted); text-align:right; font-style:italic;">* Nhập trực tiếp số liệu vào các ô trên. Tự động định dạng hàng nghìn. (Bấm dấu + ở góc để thêm thẻ)</p>
            </div>

        </div>
    </div>

    <!-- TEMPLATES DEFAULT ĐỂ TẠO BÁO CÁO MỚI -->
    <template id="tpl-default-deck">
        <!-- SLIDE 1: BÌA -->
        <div class="slide-section hero-slide" id="slide-1">
            <button class="edit-overlay no-print" onclick="changeHeroBg(this)">
                <i class="fa-solid fa-camera"></i> Đổi ảnh nền
            </button>
            <div class="slide-actions no-print">
                <button class="act-btn" onclick="addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-file-circle-plus"></i></button>
                <button class="act-btn" onclick="addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-object-group"></i></button>
            </div>
            <div class="hero-content">
                <h3 contenteditable="true">BÁO CÁO HOẠT ĐỘNG MARKETING</h3>
                <h1 contenteditable="true">THE WIN CITY</h1>
                <p contenteditable="true">Tuần: --/--/2026 – --/--/2026</p>
            </div>
        </div>

        <!-- SLIDE 2: NGÂN SÁCH -->
        <div class="slide-section" id="slide-2">
            <div class="slide-actions no-print">
                <button class="act-btn" style="color:var(--success);" onclick="addBudgetCard(this)" title="Thêm thẻ ngân sách"><i class="fa-solid fa-plus"></i></button>
                <button class="act-btn" onclick="addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-file-circle-plus"></i></button>
                <button class="act-btn" onclick="addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-object-group"></i></button>
                <button class="act-btn del" onclick="this.closest('.slide-section').remove()" title="Xóa Slide"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <h2 class="slide-title" contenteditable="true">BÁO CÁO NGÂN SÁCH CHI TIẾT</h2>
            <div class="slide-content-area">
                <div class="budget-grid">
                    <div class="budget-card card-approved">
                        <div class="card-header"><span class="label" contenteditable="true">Ngân sách được duyệt</span></div>
                        <div class="amount auto-format" contenteditable="true">65.000.000.000</div>
                    </div>
                    <div class="budget-card card-signed">
                        <div class="card-header"><span class="label" contenteditable="true">Giá trị hợp đồng đã ký</span></div>
                        <div class="amount auto-format" contenteditable="true">39.028.549.837</div>
                    </div>
                    <div class="budget-card card-remain">
                        <div class="card-header"><span class="label" contenteditable="true">Ngân sách còn lại (Dự phòng)</span></div>
                        <div class="amount auto-format" contenteditable="true">24.997.017.363</div>
                    </div>
                    <div class="budget-card card-spent">
                        <div class="card-header"><span class="label" contenteditable="true">Đang giải ngân (Số dư HĐ)</span></div>
                        <div class="amount auto-format" contenteditable="true">05.525.366.190</div>
                    </div>
                </div>
            </div>
            <p contenteditable="true" style="margin-top:20px; font-size:13px; color:var(--text-muted); text-align:right; font-style:italic;">* Nhập trực tiếp số liệu vào các ô trên. Tự động định dạng hàng nghìn.</p>
        </div>
    </template>

    <template id="tpl-blank">
        <div class="slide-section">
            <div class="slide-actions no-print">
                <button class="act-btn" style="color:var(--navy);" onclick="addTable(this)" title="Chèn Bảng"><i class="fa-solid fa-table"></i></button>
                <button class="act-btn" onclick="addDriveGrid(this)" title="Chèn ảnh Drive"><i class="fa-brands fa-google-drive"></i></button>
                <button class="act-btn" onclick="addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-file-circle-plus"></i></button>
                <button class="act-btn" onclick="addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-object-group"></i></button>
                <button class="act-btn del" onclick="this.closest('.slide-section').remove()" title="Xóa Slide"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <h2 class="slide-title" contenteditable="true">TIÊU ĐỀ SLIDE MỚI</h2>
            <div class="slide-content-area">
                <p contenteditable="true" style="color:var(--text-muted); font-style:italic;">Bấm vào đây để nhập nội dung, hoặc dùng các nút công cụ bên góc phải để chèn bảng/hình ảnh...</p>
            </div>
        </div>
    </template>

    <template id="tpl-app">
        <div class="slide-section slide-app-full">
            <button class="edit-overlay no-print" onclick="connectIframe(this)">
                <i class="fa-solid fa-link"></i> Đổi Link App
            </button>
            <div class="slide-actions no-print" style="z-index:1000;">
                <button class="act-btn" onclick="addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-file-circle-plus"></i></button>
                <button class="act-btn" onclick="addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-object-group"></i></button>
                <button class="act-btn del" onclick="this.closest('.slide-section').remove()" title="Xóa Slide"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <div class="app-iframe-container">
                <iframe src="about:blank"></iframe>
            </div>
        </div>
    </template>

    <!-- FIREBASE & SMART DATA FLOW -->
    <script type="module">
        const myFirebaseConfig = {
            apiKey: "AIzaSyChhCZVv8-Yc_6YlkxwHW57O01zVMyu8lc",
            authDomain: "mktreport-46312.firebaseapp.com",
            projectId: "mktreport-46312",
            storageBucket: "mktreport-46312.firebasestorage.app",
            messagingSenderId: "734080036393",
            appId: "1:734080036393:web:7a0d6113b91741f763b638"
        };

        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : myFirebaseConfig;
        const appIdStr = typeof __app_id !== 'undefined' ? __app_id : 'marketing-twc-premium-v24';

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        
        let user = null;
        let currentDocId = null;
        let currentDocName = "";

        const initAuth = async () => { try { await signInAnonymously(auth); } catch (err) {} };
        onAuthStateChanged(auth, (u) => { user = u; if (u) loadHistory(); });
        initAuth();

        window.createNewReportTemplate = function() {
            if(confirm("Hành động này sẽ XÓA tất cả nội dung chưa lưu trên màn hình hiện tại.\nBạn có chắc chắn muốn TẠO BÁO CÁO MỚI không?")) {
                observer.disconnect(); 
                document.getElementById('deck-container').innerHTML = document.getElementById('tpl-default-deck').innerHTML;
                currentDocId = null; currentDocName = "";
                document.querySelectorAll('.report-item').forEach(el => el.classList.remove('active'));
                
                const ind = document.getElementById('auto-save-text');
                ind.className = "auto-save-indicator";
                ind.innerHTML = `<i class="fa-solid fa-circle-info"></i> Lưu báo cáo lần đầu để bật Tự Động Lưu`;
                
                formatAllNumbers();
                observer.observe(document.getElementById('deck-container'), { childList: true, subtree: true, characterData: true });
                window.scrollTo({ top: 0, behavior: 'smooth' });
                document.getElementById('main-menu').classList.add('hidden');
            }
        }

        window.handleSaveRequest = async function() {
            if (!user) return alert("Hệ thống đang xác thực, vui lòng chờ...");
            if (currentDocId) {
                const choice = confirm("Bạn đang sửa một báo cáo có sẵn.\n\n- Bấm [OK] để GHI ĐÈ lên báo cáo hiện tại.\n- Bấm [HỦY] để LƯU THÀNH BẢN SAO MỚI.");
                if (choice) {
                    try { await _saveToFirestore(currentDocId, currentDocName); alert("Đã ghi đè báo cáo thành công!"); return; } 
                    catch (e) { return alert("Lỗi ghi đè: " + e.message); }
                }
            }

            const name = prompt("Nhập tên bản báo cáo mới:", "Báo cáo " + new Date().toLocaleDateString('vi-VN'));
            if (!name) return;
            try {
                const q = collection(db, 'artifacts', appIdStr, 'public', 'data', 'reports');
                const snap = await getDocs(q);
                let isDuplicate = false;
                snap.forEach(d => { if(d.data().name === name) isDuplicate = true; });
                if (isDuplicate) return alert("Tên báo cáo này đã tồn tại trong kho! Vui lòng chọn một tên khác.");

                const reportId = Date.now().toString();
                await _saveToFirestore(reportId, name);
                
                currentDocId = reportId; currentDocName = name;
                document.getElementById('auto-save-text').className = "auto-save-indicator active";
                document.getElementById('auto-save-text').innerHTML = `<i class="fa-solid fa-shield-check"></i> Đã kích hoạt Lưu Tự Động`;
                alert("Đã tạo báo cáo mới thành công!");
            } catch(e) { alert("Lỗi tạo mới: " + e.message); }
        }

        async function _saveToFirestore(id, name) {
            const content = document.getElementById('deck-container').innerHTML;
            const ref = doc(db, 'artifacts', appIdStr, 'public', 'data', 'reports', id);
            await setDoc(ref, { name, content, time: new Date().toISOString(), userId: user.uid });
            loadHistory();
        }

        window.deleteReport = async function(id, name) {
            if(confirm(`🚨 NGUY HIỂM: Bạn có chắc chắn muốn XÓA VĨNH VIỄN báo cáo "${name}" không?`)) {
                try {
                    await deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'reports', id));
                    if(currentDocId === id) {
                        currentDocId = null; currentDocName = "";
                        document.getElementById('auto-save-text').className = "auto-save-indicator";
                        document.getElementById('auto-save-text').innerHTML = `<i class="fa-solid fa-circle-info"></i> Lưu báo cáo lần đầu để bật Tự Động Lưu`;
                    }
                    loadHistory();
                } catch(e) {}
            }
        }

        async function loadHistory() {
            const list = document.getElementById('report-history');
            try {
                const q = collection(db, 'artifacts', appIdStr, 'public', 'data', 'reports');
                const snap = await getDocs(q);
                let docs = []; snap.forEach(d => { let data = d.data(); data.id = d.id; docs.push(data); });
                docs.sort((a, b) => new Date(b.time) - new Date(a.time));
                
                list.innerHTML = "";
                if(docs.length === 0) return list.innerHTML = '<li class="report-item" style="opacity:0.5; justify-content:center;">Kho lưu trữ trống</li>';
                
                docs.forEach(data => {
                    const li = document.createElement('li');
                    li.className = `report-item ${data.id === currentDocId ? 'active' : ''}`;
                    const dateObj = new Date(data.time);
                    const timeStr = `${dateObj.getHours().toString().padStart(2,'0')}:${dateObj.getMinutes().toString().padStart(2,'0')} - ${dateObj.getDate().toString().padStart(2,'0')}/${(dateObj.getMonth()+1).toString().padStart(2,'0')}`;

                    li.innerHTML = `
                        <div class="report-info" onclick="openReport('${data.id}', '${data.name}')">
                            <div class="r-name"><i class="fa-solid fa-file-invoice"></i> ${data.name}</div>
                            <div class="r-time"><i class="fa-regular fa-clock"></i> ${timeStr}</div>
                        </div>
                        <button class="btn-del-report" onclick="deleteReport('${data.id}', '${data.name}')" title="Xóa báo cáo này"><i class="fa-solid fa-trash-can"></i></button>
                    `;
                    list.appendChild(li);
                });
            } catch(e) { list.innerHTML = `<li class="report-item" style="color:var(--danger); justify-content:center; padding:15px; text-align:center;">Lỗi tải dữ liệu</li>`; }
        }

        window.openReport = function(id, name) {
            if(confirm(`Mở "${name}"?\n(Những thay đổi chưa lưu của màn hình hiện tại sẽ bị mất)`)) {
                observer.disconnect();
                _fetchAndRenderReport(id, name);
            }
        }

        async function _fetchAndRenderReport(id, name) {
            try {
                const docSnap = await getDocs(collection(db, 'artifacts', appIdStr, 'public', 'data', 'reports'));
                let targetContent = "";
                docSnap.forEach(d => { if(d.id === id) targetContent = d.data().content; });
                if(targetContent) {
                    document.getElementById('deck-container').innerHTML = targetContent;
                    currentDocId = id; currentDocName = name;
                    document.getElementById('auto-save-text').className = "auto-save-indicator active";
                    document.getElementById('auto-save-text').innerHTML = `<i class="fa-solid fa-shield-check"></i> Đang tự động lưu...`;
                    formatAllNumbers();
                    loadHistory();
                    observer.observe(document.getElementById('deck-container'), { childList: true, subtree: true, characterData: true });
                }
            } catch(e) {}
        }

        let saveTimer;
        const observer = new MutationObserver(() => {
            if (!user || !currentDocId) return;
            clearTimeout(saveTimer);
            document.getElementById('auto-save-text').className = "auto-save-indicator saving";
            document.getElementById('auto-save-text').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
            
            saveTimer = setTimeout(async () => {
                try {
                    const content = document.getElementById('deck-container').innerHTML;
                    const ref = doc(db, 'artifacts', appIdStr, 'public', 'data', 'reports', currentDocId);
                    await setDoc(ref, { name: currentDocName, content, time: new Date().toISOString(), userId: user.uid }, { merge: true });
                    const time = new Date();
                    document.getElementById('auto-save-text').className = "auto-save-indicator active";
                    document.getElementById('auto-save-text').innerHTML = `<i class="fa-solid fa-check-double"></i> Đã lưu lúc ${time.getHours().toString().padStart(2,'0')}:${time.getMinutes().toString().padStart(2, '0')}`;
                } catch(e) { console.warn("Auto-save failed", e); }
            }, 1000);
        });
        observer.observe(document.getElementById('deck-container'), { childList: true, subtree: true, characterData: true });
    </script>

    <script>
        // ==========================================================================
        // UI INTERACTIONS, BẢNG BIỂU (TABLES) & AUTO-PAGINATION
        // ==========================================================================
        let idle;
        document.addEventListener('mousemove', () => {
            document.querySelectorAll('.slide-section').forEach(s => s.classList.remove('idle'));
            clearTimeout(idle);
            idle = setTimeout(() => { document.querySelectorAll('.slide-section').forEach(s => s.classList.add('idle')); }, 2500);
        });

        window.formatNumber = (n) => n.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        window.formatAllNumbers = () => document.querySelectorAll('.auto-format').forEach(el => el.innerText = formatNumber(el.innerText));
        document.addEventListener('input', (e) => { if(e.target.classList.contains('auto-format')) e.target.innerText = formatNumber(e.target.innerText); });

        document.getElementById('zoom-range').addEventListener('input', (e) => {
            document.documentElement.style.setProperty('--zoom', e.target.value);
            document.getElementById('zoom-txt').innerText = Math.round(e.target.value * 100) + '%';
        });

        window.addNewSlide = function(type) {
            const temp = document.getElementById(type === 'blank' ? 'tpl-blank' : 'tpl-app');
            const clone = temp.content.cloneNode(true);
            document.getElementById('deck-container').appendChild(clone);
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }

        window.changeHeroBg = (btn) => {
            const url = prompt("URL ảnh nền mới:");
            if(url) btn.closest('.slide-section').style.backgroundImage = `url('${url}')`;
        }

        window.connectIframe = (btn) => {
            const url = prompt("Dán Link App/Website (Cần có https://):");
            if(url) {
                const iframe = btn.closest('.slide-section').querySelector('iframe');
                if(iframe) iframe.src = url;
            }
        }

        // --- DYNAMIC BUDGET CARDS ---
        window.addBudgetCard = function(btn) {
            const grid = btn.closest('.slide-section').querySelector('.budget-grid');
            const newCardHTML = `
                <div class="budget-card">
                    <button class="no-print edit-overlay" style="top:5px; right:5px; left:auto; padding:4px 8px; background:var(--danger); font-size:10px; opacity:0; transition:0.2s;" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
                    <div class="card-header"><span class="label" contenteditable="true">Khoản mục mới</span></div>
                    <div class="amount auto-format" contenteditable="true">0</div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', newCardHTML);
            
            const newCards = grid.querySelectorAll('.budget-card');
            const justAdded = newCards[newCards.length - 1];
            justAdded.addEventListener('mouseenter', () => { justAdded.querySelector('.edit-overlay').style.opacity = '1'; });
            justAdded.addEventListener('mouseleave', () => { justAdded.querySelector('.edit-overlay').style.opacity = '0'; });
            formatAllNumbers();
        }

        // --- SMART TABLES & AUTO-SPLIT ---
        window.addTable = function(btn) {
            const container = btn.closest('.slide-section').querySelector('.slide-content-area');
            const placeholder = container.querySelector('p');
            if(placeholder && placeholder.innerText.includes('Bấm vào đây')) placeholder.remove();

            const tableHTML = `
                <div class="table-wrapper">
                    <div class="table-controls no-print">
                        <button class="tc-btn" onclick="addTableCol(this)" title="Thêm Cột"><i class="fa-solid fa-plus"></i> Cột</button>
                        <button class="tc-btn" onclick="addTableRow(this)" title="Thêm Dòng"><i class="fa-solid fa-plus"></i> Dòng</button>
                        <button class="tc-btn del" onclick="this.closest('.table-wrapper').remove()" title="Xóa Bảng"><i class="fa-solid fa-trash"></i> Bảng</button>
                    </div>
                    <table class="custom-table">
                        <thead>
                            <tr>
                                <th contenteditable="true">Tiêu đề Cột 1</th>
                                <th contenteditable="true">Tiêu đề Cột 2</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td contenteditable="true">Dữ liệu...</td>
                                <td contenteditable="true">Dữ liệu...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', tableHTML);
        }

        window.addTableCol = function(btn) {
            const table = btn.closest('.table-wrapper').querySelector('table');
            const theadTr = table.querySelector('thead tr');
            const newTh = document.createElement('th');
            newTh.setAttribute('contenteditable', 'true');
            newTh.innerHTML = 'CỘT MỚI';
            theadTr.appendChild(newTh);

            const tbodyTrs = table.querySelectorAll('tbody tr');
            tbodyTrs.forEach(tr => {
                const newTd = document.createElement('td');
                newTd.setAttribute('contenteditable', 'true');
                newTd.innerHTML = '...';
                tr.appendChild(newTd);
            });
        }

        window.addTableRow = function(btn) {
            const wrapper = btn.closest('.table-wrapper');
            const table = wrapper.querySelector('table');
            const tbody = table.querySelector('tbody');
            const cols = table.querySelector('thead tr').children.length;
            
            const newTr = document.createElement('tr');
            for(let i=0; i<cols; i++) {
                const td = document.createElement('td');
                td.setAttribute('contenteditable', 'true');
                td.innerHTML = '...';
                newTr.appendChild(td);
            }
            tbody.appendChild(newTr);

            checkSlideOverflowAndSplit(wrapper.closest('.slide-section'));
        }

        function checkSlideOverflowAndSplit(currentSlide) {
            const contentArea = currentSlide.querySelector('.slide-content-area');
            
            if (contentArea.scrollHeight > contentArea.clientHeight) {
                const tableWrapper = currentSlide.querySelector('.table-wrapper');
                const tbody = tableWrapper.querySelector('tbody');
                const lastRow = tbody.lastElementChild;
                
                if (tbody.children.length <= 1) return; 

                const newSlideTemplate = document.getElementById('tpl-blank').content.cloneNode(true);
                const newSlide = newSlideTemplate.querySelector('.slide-section');
                
                newSlide.querySelector('.slide-title').innerHTML = currentSlide.querySelector('.slide-title').innerHTML;
                
                const newContentArea = newSlide.querySelector('.slide-content-area');
                newContentArea.innerHTML = '';
                
                const newTableWrapper = tableWrapper.cloneNode(false);
                newTableWrapper.innerHTML = `
                    <div class="table-controls no-print">
                        <button class="tc-btn" onclick="addTableCol(this)" title="Thêm Cột"><i class="fa-solid fa-plus"></i> Cột</button>
                        <button class="tc-btn" onclick="addTableRow(this)" title="Thêm Dòng"><i class="fa-solid fa-plus"></i> Dòng</button>
                        <button class="tc-btn del" onclick="this.closest('.table-wrapper').remove()" title="Xóa Bảng"><i class="fa-solid fa-trash"></i> Bảng</button>
                    </div>
                `;
                const newTable = document.createElement('table');
                newTable.className = 'custom-table';
                
                const thead = tableWrapper.querySelector('thead').cloneNode(true);
                const newTbody = document.createElement('tbody');
                
                newTbody.appendChild(lastRow);
                
                newTable.appendChild(thead);
                newTable.appendChild(newTbody);
                newTableWrapper.appendChild(newTable);
                newContentArea.appendChild(newTableWrapper);
                
                currentSlide.parentNode.insertBefore(newSlide, currentSlide.nextSibling);
                
                const notif = document.createElement('div');
                notif.style = "position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:var(--primary); color:white; padding:8px 16px; border-radius:20px; font-size:12px; font-weight:bold; z-index:100; animation: fadeOut 3s forwards;";
                notif.innerText = "Tự động ngắt trang (Auto-pagination)";
                newSlide.appendChild(notif);

                window.scrollTo({ top: newSlide.offsetTop - 50, behavior: 'smooth' });
            }
        }

        const style = document.createElement('style');
        style.innerHTML = `@keyframes fadeOut { 0% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; display: none; } }`;
        document.head.appendChild(style);

        window.addDriveGrid = (btn) => {
            const container = btn.closest('.slide-section').querySelector('.slide-content-area');
            const input = prompt("Dán các link Drive (phân tách dấu phẩy):");
            if (!input) return;
            const placeholder = container.querySelector('p');
            if(placeholder && placeholder.innerText.includes('Bấm vào đây')) placeholder.remove();

            let grid = container.querySelector('.drive-grid');
            if(!grid) {
                grid = document.createElement('div');
                grid.className = 'drive-grid';
                container.appendChild(grid);
            }

            input.split(',').forEach(l => {
                const idMatch = l.match(/[-\w]{25,}/);
                if (idMatch) {
                    const div = document.createElement('div');
                    div.className = 'drive-box';
                    div.innerHTML = `<img src="https://drive.google.com/uc?export=view&id=${idMatch[0]}" onerror="this.src='https://placehold.co/600x400?text=Lỗi+Drive'"><button class="no-print edit-overlay" style="top:10px; right:10px; left:auto; padding:6px 12px; background:var(--danger);" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash-can"></i></button>`;
                    grid.appendChild(div);
                }
            });
        }

        window.onload = formatAllNumbers;
    </script>
</body>
</html>
```