import { useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";

// --- 1. CẤU HÌNH FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyChhCZVv8-Yc_6YlkxwHW57O01zVMyu8lc",
    authDomain: "mktreport-46312.firebaseapp.com",
    projectId: "mktreport-46312",
    storageBucket: "mktreport-46312.firebasestorage.app",
    messagingSenderId: "734080036393",
    appId: "1:734080036393:web:7a0d6113b91741f763b638"
};

const appIdStr = 'marketing-twc-premium-v24';

export default function App() {
    const isInitialized = useRef(false);

    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        // Khởi tạo Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        
        let user: any = null;
        let currentDocId: string | null = null;
        let currentDocName = "";
        let currentEditable: HTMLElement | null = null;

        const initAuth = async () => {
            try { await signInAnonymously(auth); } catch (err) {
                console.error("Firebase Auth Error:", err);
                const el = document.getElementById('report-history');
                if (el) el.innerHTML = `<li class="report-item" style="color:var(--danger); text-align:center;">Lỗi xác thực Firebase!</li>`;
            }
        };

        onAuthStateChanged(auth, (u) => { 
            user = u; 
            if (u) loadHistory(); 
        });
        initAuth();

        // --- 2. GẮN CÁC HÀM XỬ LÝ VÀO WINDOW ĐỂ HTML HOẠT ĐỘNG ---
        (window as any).createNewReportTemplate = function() {
            if(confirm("Hành động này sẽ XÓA tất cả nội dung chưa lưu trên màn hình hiện tại.\nBạn có chắc chắn muốn TẠO BÁO CÁO MỚI không?")) {
                observer.disconnect(); 
                const tpl = document.getElementById('tpl-default-deck');
                const deck = document.getElementById('deck-container');
                if (tpl && deck) deck.innerHTML = tpl.innerHTML;
                
                currentDocId = null; 
                currentDocName = "";
                document.querySelectorAll('.report-item').forEach(el => el.classList.remove('active'));
                
                const ind = document.getElementById('auto-save-text');
                if(ind) {
                    ind.className = "auto-save-indicator";
                    ind.innerHTML = `<i class="fa-solid fa-circle-info"></i> Lưu báo cáo lần đầu để bật Tự Động Lưu`;
                }
                
                (window as any).formatAllNumbers();
                (window as any).initTableResizers(); // Khởi tạo tính năng kéo cột bảng
                if(deck) observer.observe(deck, { childList: true, subtree: true, characterData: true });
                window.scrollTo({ top: 0, behavior: 'smooth' });
                document.getElementById('main-menu')?.classList.add('hidden');
            }
        };

        (window as any).handleSaveRequest = async function() {
            if (!user) return alert("Hệ thống đang xác thực, vui lòng chờ...");
            if (currentDocId) {
                const choice = confirm("Bạn đang sửa một báo cáo có sẵn.\n\n- Bấm [OK] để GHI ĐÈ lên báo cáo hiện tại.\n- Bấm [HỦY] để LƯU THÀNH BẢN SAO MỚI.");
                if (choice) {
                    try { await _saveToFirestore(currentDocId, currentDocName); alert("Đã ghi đè báo cáo thành công!"); return; } 
                    catch (err: any) { return alert("Lỗi ghi đè: " + err.message); }
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
                const ind = document.getElementById('auto-save-text');
                if(ind) {
                    ind.className = "auto-save-indicator active";
                    ind.innerHTML = `<i class="fa-solid fa-shield-check"></i> Đã kích hoạt Lưu Tự Động`;
                }
                alert("Đã tạo báo cáo mới thành công!");
            } catch(err: any) { alert("Lỗi tạo mới: " + err.message); }
        };

        async function _saveToFirestore(id: string, name: string) {
            const content = document.getElementById('deck-container')?.innerHTML || "";
            const ref = doc(db, 'artifacts', appIdStr, 'public', 'data', 'reports', id);
            await setDoc(ref, { name, content, time: new Date().toISOString(), userId: user.uid });
            loadHistory();
        }

        (window as any).deleteReport = async function(id: string, name: string) {
            if(confirm(`🚨 NGUY HIỂM: Bạn có chắc chắn muốn XÓA VĨNH VIỄN báo cáo "${name}" không?`)) {
                try {
                    await deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'reports', id));
                    if(currentDocId === id) {
                        currentDocId = null; currentDocName = "";
                        const ind = document.getElementById('auto-save-text');
                        if (ind) {
                            ind.className = "auto-save-indicator";
                            ind.innerHTML = `<i class="fa-solid fa-circle-info"></i> Lưu báo cáo lần đầu để bật Tự Động Lưu`;
                        }
                    }
                    loadHistory();
                } catch(err) { console.error("Lỗi xóa báo cáo:", err); }
            }
        };

        async function loadHistory() {
            const list = document.getElementById('report-history');
            if(!list) return;
            try {
                const q = collection(db, 'artifacts', appIdStr, 'public', 'data', 'reports');
                const snap = await getDocs(q);
                let docs: any[] = []; snap.forEach(d => { let data = d.data(); data.id = d.id; docs.push(data); });
                docs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
                
                list.innerHTML = "";
                if(docs.length === 0) {
                    list.innerHTML = '<li class="report-item" style="opacity:0.5; justify-content:center;">Kho lưu trữ trống</li>';
                    return;
                }
                
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
            } catch(err) {
                console.error("Lỗi loadHistory:", err);
                list.innerHTML = `<li class="report-item" style="color:var(--danger); justify-content:center; padding:15px; text-align:center;">Lỗi tải dữ liệu</li>`;
            }
        }

        (window as any).openReport = function(id: string, name: string) {
            if(confirm(`Mở "${name}"?\n(Những thay đổi chưa lưu của màn hình hiện tại sẽ bị mất)`)) {
                observer.disconnect();
                _fetchAndRenderReport(id, name);
            }
        };

        async function _fetchAndRenderReport(id: string, name: string) {
            try {
                const docSnap = await getDocs(collection(db, 'artifacts', appIdStr, 'public', 'data', 'reports'));
                let targetContent = "";
                docSnap.forEach(d => { if(d.id === id) targetContent = d.data().content; });
                if(targetContent) {
                    const deck = document.getElementById('deck-container');
                    if (deck) deck.innerHTML = targetContent;
                    currentDocId = id; currentDocName = name;
                    
                    const ind = document.getElementById('auto-save-text');
                    if(ind) {
                        ind.className = "auto-save-indicator active";
                        ind.innerHTML = `<i class="fa-solid fa-shield-check"></i> Đang tự động lưu...`;
                    }
                    (window as any).formatAllNumbers();
                    (window as any).initTableResizers();
                    loadHistory();
                    if(deck) observer.observe(deck, { childList: true, subtree: true, characterData: true });
                }
            } catch(err) { console.error("Lỗi _fetchAndRenderReport:", err); }
        }

        // Auto-save logic
        let saveTimer: any;
        const observer = new MutationObserver(() => {
            if (!user || !currentDocId) return;
            clearTimeout(saveTimer);
            const ind = document.getElementById('auto-save-text');
            if(ind) {
                ind.className = "auto-save-indicator saving";
                ind.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
            }
            
            saveTimer = setTimeout(async () => {
                try {
                    const content = document.getElementById('deck-container')?.innerHTML || "";
                    const ref = doc(db, 'artifacts', appIdStr, 'public', 'data', 'reports', currentDocId as string);
                    await setDoc(ref, { name: currentDocName, content, time: new Date().toISOString(), userId: user.uid }, { merge: true });
                    const time = new Date();
                    if(ind) {
                        ind.className = "auto-save-indicator active";
                        ind.innerHTML = `<i class="fa-solid fa-check-double"></i> Đã lưu lúc ${time.getHours().toString().padStart(2,'0')}:${time.getMinutes().toString().padStart(2, '0')}`;
                    }
                } catch(err) { console.warn("Auto-save failed", err); }
            }, 1000);
        });

        setTimeout(() => {
            const deck = document.getElementById('deck-container');
            if (deck) observer.observe(deck, { childList: true, subtree: true, characterData: true });
        }, 1000);

        // --- CÁC TÍNH NĂNG ĐỊNH DẠNG TEXT (NGANG, DỌC) ---
        document.addEventListener('focusin', (e: any) => {
            if(e.target && e.target.getAttribute('contenteditable') === 'true') {
                currentEditable = e.target;
                const toolbar = document.getElementById('format-toolbar');
                if(toolbar) {
                    const rect = e.target.getBoundingClientRect();
                    toolbar.style.display = 'flex';
                    toolbar.style.top = (rect.top - 40) + 'px';
                    toolbar.style.left = rect.left + 'px';
                }
            }
        });

        document.addEventListener('mousedown', (e: any) => {
            const toolbar = document.getElementById('format-toolbar');
            if(toolbar && !toolbar.contains(e.target as Node) && (!e.target.getAttribute || e.target.getAttribute('contenteditable') !== 'true')) {
                toolbar.style.display = 'none';
            }
        });

        (window as any).applyAlignment = (align: string) => {
            document.execCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`);
        };

        (window as any).applyVerticalAlign = (align: string) => {
            if(currentEditable) {
                currentEditable.style.display = 'flex';
                currentEditable.style.flexDirection = 'column';
                currentEditable.style.justifyContent = align;
            }
        };

        document.addEventListener('keydown', (e: any) => {
            if (e.key === 'Enter' && e.target.getAttribute('contenteditable') === 'true') {
                e.preventDefault();
                document.execCommand('insertLineBreak');
            }
        });

        // --- ĐỊNH DẠNG SỐ AUTO-FORMAT THÔNG MINH ---
        (window as any).formatNumber = (n: string) => n.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        
        document.addEventListener('input', (e: any) => { 
            if(e.target.classList.contains('auto-format')) {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                
                const originalText = e.target.innerText;
                const caretPos = getCaretPosition(e.target);
                
                const newText = (window as any).formatNumber(originalText);
                e.target.innerText = newText;
                
                const dotsAdded = (newText.match(/\./g) || []).length - (originalText.match(/\./g) || []).length;
                setCaretPosition(e.target, Math.max(0, caretPos + dotsAdded));
            } 
        });

        function getCaretPosition(element: HTMLElement) {
            let position = 0;
            const isSupported = typeof window.getSelection !== "undefined";
            if (isSupported) {
                const selection = window.getSelection();
                if (selection && selection.rangeCount !== 0) {
                    const range = selection.getRangeAt(0);
                    const preCaretRange = range.cloneRange();
                    preCaretRange.selectNodeContents(element);
                    preCaretRange.setEnd(range.endContainer, range.endOffset);
                    position = preCaretRange.toString().length;
                }
            }
            return position;
        }

        function setCaretPosition(element: HTMLElement, position: number) {
            const selection = window.getSelection();
            const range = document.createRange();
            let currentPos = 0;
            let nodeFound = false;

            function traverseNodes(node: Node) {
                if (nodeFound) return;
                if (node.nodeType === 3) {
                    const length = node.textContent?.length || 0;
                    if (currentPos + length >= position) {
                        range.setStart(node, position - currentPos);
                        range.collapse(true);
                        nodeFound = true;
                    } else {
                        currentPos += length;
                    }
                } else {
                    for (let i = 0; i < node.childNodes.length; i++) {
                        traverseNodes(node.childNodes[i]);
                    }
                }
            }
            traverseNodes(element);
            if (nodeFound && selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }

        (window as any).formatAllNumbers = () => document.querySelectorAll('.auto-format').forEach((el: any) => el.innerText = (window as any).formatNumber(el.innerText));

        document.getElementById('zoom-range')?.addEventListener('input', (e: any) => {
            document.documentElement.style.setProperty('--zoom', e.target.value);
            const txt = document.getElementById('zoom-txt');
            if(txt) txt.innerText = Math.round(e.target.value * 100) + '%';
        });

        // Slide interactions
        (window as any).addNewSlide = function(type: string) {
            const tempId = type === 'blank' ? 'tpl-blank' : 'tpl-app';
            const temp = document.getElementById(tempId) as HTMLTemplateElement;
            if(!temp) return;
            const clone = temp.content.cloneNode(true);
            document.getElementById('deck-container')?.appendChild(clone);
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            (window as any).initTableResizers();
        };

        (window as any).changeHeroBg = (btn: HTMLElement) => {
            const url = prompt("URL ảnh nền mới:");
            if(url) {
                const section = btn.closest('.slide-section') as HTMLElement;
                if(section) section.style.backgroundImage = `url('${url}')`;
            }
        };

        (window as any).connectIframe = (btn: HTMLElement) => {
            const url = prompt("Dán Link App/Website (Cần có https://):");
            if(url) {
                const iframe = btn.closest('.slide-section')?.querySelector('iframe');
                if(iframe) iframe.src = url;
            }
        };

        (window as any).addBudgetCard = function(btn: HTMLElement) {
            const grid = btn.closest('.slide-section')?.querySelector('.budget-grid');
            if(!grid) return;
            const newCardHTML = `
                <div class="budget-card">
                    <button class="no-print edit-overlay" style="top:5px; right:5px; left:auto; padding:4px 8px; background:var(--danger); font-size:10px; opacity:0; transition:0.2s;" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
                    <div class="card-header"><span class="label" contenteditable="true">Khoản mục mới</span></div>
                    <div class="amount auto-format" contenteditable="true">0</div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', newCardHTML);
            
            const newCards = grid.querySelectorAll('.budget-card');
            const justAdded = newCards[newCards.length - 1] as HTMLElement;
            justAdded.addEventListener('mouseenter', () => { (justAdded.querySelector('.edit-overlay') as HTMLElement).style.opacity = '1'; });
            justAdded.addEventListener('mouseleave', () => { (justAdded.querySelector('.edit-overlay') as HTMLElement).style.opacity = '0'; });
            (window as any).formatAllNumbers();
        };

        // --- BẢNG BIỂU & KÉO CỘT ---
        (window as any).addTable = function(btn: HTMLElement) {
            const container = btn.closest('.slide-section')?.querySelector('.slide-content-area');
            if(!container) return;
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
                                <th><div contenteditable="true" class="th-content">Tiêu đề Cột 1</div><div class="col-resizer"></div></th>
                                <th><div contenteditable="true" class="th-content">Tiêu đề Cột 2</div><div class="col-resizer"></div></th>
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
            (window as any).initTableResizers();
        };

        (window as any).addTableCol = function(btn: HTMLElement) {
            const table = btn.closest('.table-wrapper')?.querySelector('table');
            if(!table) return;
            const theadTr = table.querySelector('thead tr');
            if(!theadTr) return;
            const newTh = document.createElement('th');
            newTh.innerHTML = '<div contenteditable="true" class="th-content">CỘT MỚI</div><div class="col-resizer"></div>';
            theadTr.appendChild(newTh);

            const tbodyTrs = table.querySelectorAll('tbody tr');
            tbodyTrs.forEach(tr => {
                const newTd = document.createElement('td');
                newTd.setAttribute('contenteditable', 'true');
                newTd.innerHTML = '...';
                tr.appendChild(newTd);
            });
            (window as any).initTableResizers();
        };

        (window as any).initTableResizers = function() {
            const resizers = document.querySelectorAll('.col-resizer');
            resizers.forEach((resizer: any) => {
                resizer.removeEventListener('mousedown', initDrag);
                resizer.addEventListener('mousedown', initDrag);
            });

            let startX: number, startWidth: number, currentTh: HTMLElement;
            
            function initDrag(e: MouseEvent) {
                currentTh = (e.target as HTMLElement).parentElement as HTMLElement;
                startX = e.clientX;
                startWidth = currentTh.offsetWidth;
                document.addEventListener('mousemove', doDrag);
                document.addEventListener('mouseup', stopDrag);
                (e.target as HTMLElement).classList.add('resizing');
            }

            function doDrag(e: MouseEvent) {
                if(currentTh) {
                    currentTh.style.width = (startWidth + e.clientX - startX) + 'px';
                }
            }

            function stopDrag() {
                document.removeEventListener('mousemove', doDrag);
                document.removeEventListener('mouseup', stopDrag);
                document.querySelectorAll('.col-resizer').forEach(r => r.classList.remove('resizing'));
            }
        };

        function checkSlideOverflowAndSplit(currentSlide: HTMLElement) {
            const contentArea = currentSlide.querySelector('.slide-content-area');
            if (!contentArea) return;
            
            if (contentArea.scrollHeight > contentArea.clientHeight) {
                const tableWrapper = currentSlide.querySelector('.table-wrapper');
                if(!tableWrapper) return;
                const tbody = tableWrapper.querySelector('tbody');
                if(!tbody) return;
                const lastRow = tbody.lastElementChild;
                
                if (tbody.children.length <= 1) return; 

                const template = document.getElementById('tpl-blank') as HTMLTemplateElement;
                const newSlideTemplate = template.content.cloneNode(true) as DocumentFragment;
                const newSlide = newSlideTemplate.querySelector('.slide-section') as HTMLElement;
                
                const slideTitle = currentSlide.querySelector('.slide-title');
                const newSlideTitle = newSlide.querySelector('.slide-title');
                if(slideTitle && newSlideTitle) newSlideTitle.innerHTML = slideTitle.innerHTML;
                
                const newContentArea = newSlide.querySelector('.slide-content-area');
                if(newContentArea) newContentArea.innerHTML = '';
                
                const newTableWrapper = tableWrapper.cloneNode(false) as HTMLElement;
                newTableWrapper.innerHTML = `
                    <div class="table-controls no-print">
                        <button class="tc-btn" onclick="addTableCol(this)" title="Thêm Cột"><i class="fa-solid fa-plus"></i> Cột</button>
                        <button class="tc-btn" onclick="addTableRow(this)" title="Thêm Dòng"><i class="fa-solid fa-plus"></i> Dòng</button>
                        <button class="tc-btn del" onclick="this.closest('.table-wrapper').remove()" title="Xóa Bảng"><i class="fa-solid fa-trash"></i> Bảng</button>
                    </div>
                `;
                const newTable = document.createElement('table');
                newTable.className = 'custom-table';
                
                const thead = tableWrapper.querySelector('thead')?.cloneNode(true);
                const newTbody = document.createElement('tbody');
                
                if(lastRow) newTbody.appendChild(lastRow);
                
                if(thead) newTable.appendChild(thead);
                newTable.appendChild(newTbody);
                newTableWrapper.appendChild(newTable);
                if(newContentArea) newContentArea.appendChild(newTableWrapper);
                
                currentSlide.parentNode?.insertBefore(newSlide, currentSlide.nextSibling);
                
                const notif = document.createElement('div');
                notif.style.cssText = "position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:var(--primary); color:white; padding:8px 16px; border-radius:20px; font-size:12px; font-weight:bold; z-index:100; animation: fadeOut 3s forwards;";
                notif.innerText = "Tự động ngắt trang (Auto-pagination)";
                newSlide.appendChild(notif);

                window.scrollTo({ top: newSlide.offsetTop - 50, behavior: 'smooth' });
                (window as any).initTableResizers();
            }
        }

        (window as any).addTableRow = function(btn: HTMLElement) {
            const wrapper = btn.closest('.table-wrapper');
            if(!wrapper) return;
            const table = wrapper.querySelector('table');
            if(!table) return;
            const tbody = table.querySelector('tbody');
            const theadTr = table.querySelector('thead tr');
            if(!tbody || !theadTr) return;

            const cols = theadTr.children.length;
            const newTr = document.createElement('tr');
            for(let i=0; i<cols; i++) {
                const td = document.createElement('td');
                td.setAttribute('contenteditable', 'true');
                td.innerHTML = '...';
                newTr.appendChild(td);
            }
            tbody.appendChild(newTr);

            checkSlideOverflowAndSplit(wrapper.closest('.slide-section') as HTMLElement);
        };

        (window as any).addDriveGrid = (btn: HTMLElement) => {
            const container = btn.closest('.slide-section')?.querySelector('.slide-content-area');
            if(!container) return;
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
        };

        setTimeout(() => {
            (window as any).formatAllNumbers();
            (window as any).initTableResizers();
        }, 100);

    }, []);

    // Toggle menu func
    const toggleMenu = () => {
        const menu = document.getElementById('main-menu');
        if(menu) menu.classList.toggle('hidden');
    };

    return (
        <>
            {/* INJECTED CSS */}
            <style dangerouslySetInnerHTML={{ __html: cssContent }} />
            
            {/* INJECTED HTML SHELL */}
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />

            {/* OVERRIDE TOGGLE BUTTON TO USE REACT ONCLICK INSTEAD OF INLINE HTML */}
            <button 
                className="toggle-menu-btn no-print" 
                style={{ position: 'fixed', top: '25px', right: '25px', zIndex: 10001 }} 
                onClick={toggleMenu}
            >
                <i className="fa-solid fa-sliders"></i>
            </button>
            
            {/* THANH CÔNG CỤ ĐỊNH DẠNG (TEXT ALIGNMENT) */}
            <div id="format-toolbar" className="no-print" style={{display:'none', position:'absolute', zIndex:10002, background:'white', borderRadius:'8px', boxShadow:'0 4px 15px rgba(0,0,0,0.15)', border:'1px solid #e2e8f0', padding:'6px', gap:'5px', flexWrap:'wrap', width:'max-content'}}>
                <button className="tc-btn" onClick={() => (window as any).applyAlignment('left')} title="Căn trái"><i className="fa-solid fa-align-left"></i></button>
                <button className="tc-btn" onClick={() => (window as any).applyAlignment('center')} title="Căn giữa"><i className="fa-solid fa-align-center"></i></button>
                <button className="tc-btn" onClick={() => (window as any).applyAlignment('right')} title="Căn phải"><i className="fa-solid fa-align-right"></i></button>
                <div style={{width:'1px', background:'#e2e8f0', margin:'0 4px'}}></div>
                <button className="tc-btn" onClick={() => (window as any).applyVerticalAlign('flex-start')} title="Căn trên"><i className="fa-solid fa-arrow-up-long"></i></button>
                <button className="tc-btn" onClick={() => (window as any).applyVerticalAlign('center')} title="Căn giữa dọc"><i className="fa-solid fa-arrows-up-down"></i></button>
                <button className="tc-btn" onClick={() => (window as any).applyVerticalAlign('flex-end')} title="Căn dưới"><i className="fa-solid fa-arrow-down-long"></i></button>
            </div>
        </>
    );
}

const cssContent = `
/* CSS TỰ ĐỘNG BIÊN DỊCH VÀO COMPONENT */
:root {
    --primary: #f97316;
    --primary-dark: #ea580c;
    --bg-canvas: #e2e8f0;
    --text-main: #1e293b;
    --text-sec: #64748b;
    --zoom: 1;
}

* { box-sizing: border-box; }
body {
    background-color: var(--bg-canvas);
    margin: 0; padding: 40px 0;
    display: flex; flex-direction: column; align-items: center; gap: 40px;
    font-family: 'Be Vietnam Pro', sans-serif;
}

@media print {
    body { background: white !important; padding: 0 !important; margin: 0 !important; display: block !important; }
    .no-print { display: none !important; }
    .slide-container {
        box-shadow: none !important; margin: 0 !important; border-radius: 0 !important;
        width: 1280px !important; height: 720px !important;
        page-break-after: always; transform: scale(1) !important; border: none !important;
    }
    @page { size: 1280px 720px; margin: 0; }
}

.controls-wrapper {
    position: fixed; top: 25px; right: 25px; z-index: 10000;
    display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
}
.main-menu {
    background: white; padding: 25px; border-radius: 20px;
    box-shadow: 0 15px 45px rgba(0,0,0,0.2); display: flex; flex-direction: column; gap: 15px;
    border: 1px solid #ffedd5; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    transform-origin: top right; width: 280px;
}
.main-menu.hidden { transform: scale(0.8); opacity: 0; pointer-events: none; }

.zoom-slider-container {
    background: #f8fafc; padding: 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 8px;
}
.zoom-slider-container label { font-size: 11px; font-weight: 800; color: var(--text-sec); text-transform: uppercase; }
.zoom-slider-container input { width: 100%; cursor: pointer; accent-color: var(--primary); }

.toggle-menu-btn {
    width: 55px; height: 55px; border-radius: 50%; background: var(--primary); color: white;
    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3); font-size: 22px; transition: 0.3s;
}

.btn {
    width: 100%; padding: 12px 16px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; gap: 10px; font-size: 13px; font-family: 'Be Vietnam Pro';
    transition: 0.2s;
}
.btn-new { background: #10b981; color: white; }
.btn-save { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; }
.btn-pdf { background: var(--text-main); color: white; }
.btn-add-opt { background: #f8fafc; color: var(--text-main); border: 1px solid #e2e8f0; }
.btn-add-opt:hover { background: #fff7ed; border-color: var(--primary); color: var(--primary); }

.history-sidebar {
    position: fixed; left: 0; top: 0; width: 300px; height: 100vh;
    background: #0f172a; color: white; padding: 35px 20px; z-index: 9999;
    transform: translateX(-100%); transition: 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar-tab {
    position: absolute; right: -45px; top: 25px; width: 45px; height: 50px;
    background: #0f172a; border-radius: 0 12px 12px 0; color: white;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 5px 0 15px rgba(0,0,0,0.2); font-size: 20px; transition: 0.3s; cursor: pointer;
}
.history-sidebar:hover { transform: translateX(0); box-shadow: 20px 0 50px rgba(0,0,0,0.5); }
.history-sidebar:hover .sidebar-tab { opacity: 0; }
.history-title { color: var(--primary); font-weight: 800; font-size: 15px; margin-bottom: 20px; text-transform: uppercase; padding-left: 10px;}
.report-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; max-height: calc(100vh - 100px); display: flex; flex-direction: column; gap: 8px;}
.report-item { padding: 14px 16px; background: rgba(255,255,255,0.05); border-radius: 12px; cursor: pointer; font-size: 13px; border-left: 4px solid transparent; transition: 0.2s; color: rgba(255,255,255,0.8); display: flex; align-items: center; gap: 10px; }
.report-item:hover { background: rgba(255,255,255,0.1); color: white; border-left-color: rgba(255,255,255,0.3); }
.report-item.active { background: var(--primary); color: white; border-left-color: white; font-weight: 700; }

#deck-zoom-container {
    transform: scale(var(--zoom)); transform-origin: top center;
    display: flex; flex-direction: column; gap: 60px; align-items: center; width: 100%;
}

.slide-container {
    width: 1280px; height: 720px; background: white; position: relative; overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.15); display: flex; flex-direction: column;
    padding: 60px 80px; flex-shrink: 0; border-radius: 24px;
}
.slide-container::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 8px;
    background: linear-gradient(90deg, var(--primary), var(--primary-dark));
}

.slide-title {
    font-size: 40px; font-weight: 800; color: var(--text-main); margin-bottom: 40px;
    position: relative; padding-bottom: 15px; text-transform: uppercase; line-height: 1.2;
}
.slide-title::after {
    content: ''; position: absolute; bottom: 0; left: 0; width: 80px; height: 6px;
    background: var(--primary); border-radius: 3px;
}

.slide-content-area { flex-grow: 1; display: flex; flex-direction: column; width: 100%; }

.hero-slide {
    padding: 0; justify-content: center; align-items: center; background-size: cover; background-position: center;
    background-image: url('https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1280&q=80');
}
.hero-slide::after {
    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(15, 23, 42, 0.35); z-index: 1; pointer-events: none;
}
.hero-content {
    position: relative; z-index: 2;
    background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.3);
    padding: 75px 100px; border-radius: 40px; text-align: center; color: white; box-shadow: 0 30px 60px rgba(0,0,0,0.2);
}
.hero-content h3 { margin: 0; letter-spacing: 5px; font-weight: 700; color: rgba(255,255,255,0.8); font-size: 18px; text-transform: uppercase; margin-bottom: 25px;}
.hero-content h1 { font-size: 88px; font-weight: 900; margin: 0; line-height: 1; color: white; letter-spacing: -2px;}
.hero-content p { color: var(--primary-light); font-size: 22px; font-weight: 700; letter-spacing: 6px; margin-top: 35px; text-transform: uppercase; }

.budget-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(45%, 1fr)); gap: 20px; margin-top: 10px; align-content: start; flex-grow: 1; }
.budget-card {
    background: var(--white); border-radius: 20px; padding: 25px 30px; display: flex; flex-direction: column; justify-content: center;
    position: relative; border: 1px solid var(--slate-200); box-shadow: 0 10px 30px rgba(0,0,0,0.03); transition: 0.3s;
}
.budget-card:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(0,0,0,0.08); border-color: var(--primary-light);}
.budget-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; border-radius: 20px 0 0 20px;}
.budget-card:nth-child(4n+1)::before { background: var(--primary); }
.budget-card:nth-child(4n+2)::before { background: var(--navy); }
.budget-card:nth-child(4n+3)::before { background: var(--success); }
.budget-card:nth-child(4n+4)::before { background: var(--danger); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.budget-card .label { font-size: 14px; font-weight: 700; color: var(--text-sec); text-transform: uppercase; width: 85%;}
.budget-card .amount { font-size: 44px; font-weight: 800; color: var(--navy); letter-spacing: -1px; line-height: 1; border: none; background: transparent; width: 100%; font-feature-settings: "tnum"; }
.budget-card:nth-child(4n+3) .amount { color: var(--success); }
.budget-card:nth-child(4n+4) .amount { color: var(--danger); }
.budget-card:nth-child(4n+1) .amount { color: var(--primary-dark); }

.drive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; width: 100%; flex-grow: 1; overflow-y: auto; padding: 10px; align-content: start;}
.drive-box { border-radius: 16px; overflow: hidden; height: 240px; position: relative; border: 1px solid var(--slate-200); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
.drive-box img { width: 100%; height: 100%; object-fit: cover; }

.slide-full-app { padding: 0 !important; border: none !important; background: white !important; }
.slide-full-app::before { display: none !important; }
.app-iframe-container { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; overflow: hidden; z-index: 1; }
.app-iframe-container iframe { width: 100%; height: 100%; border: none; pointer-events: auto; display: block; }

.slide-actions { position: absolute; top: 25px; right: 25px; display: flex; gap: 10px; opacity: 0; transition: 0.4s ease; z-index: 1000;}
.edit-overlay { position: absolute; top: 25px; left: 25px; background: rgba(15,23,42,0.7); backdrop-filter: blur(10px); color: white; border: none; padding: 10px 20px; border-radius: 30px; font-size: 13px; cursor: pointer; font-weight: 700; opacity: 0; transition: 0.4s ease; z-index: 1000; display: flex; align-items: center; gap: 8px;}
.edit-overlay:hover { background: var(--primary); }
.slide-section:hover .slide-actions, .slide-section:hover .edit-overlay { opacity: 1; transform: translateY(0); }
.slide-section.idle .slide-actions, .slide-section.idle .edit-overlay { opacity: 0 !important; pointer-events: none !important; transform: translateY(-5px); }

.act-btn { width: 44px; height: 44px; border-radius: 50%; border: none; background: white; cursor: pointer; color: var(--text-sec); display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); transition: 0.2s; border: 1px solid var(--slate-200); }
.act-btn:hover { background: var(--primary); color: white; border-color: var(--primary); transform: scale(1.05); }
.act-btn.del { color: var(--danger); }
.act-btn.del:hover { background: var(--danger); color: white; border-color: var(--danger); }

[contenteditable="true"] { outline: none; transition: 0.2s; padding: 2px 4px; margin: -2px -4px; border-radius: 4px; white-space: pre-wrap; word-break: break-word; }
[contenteditable="true"]:hover { background: rgba(249, 115, 22, 0.05); }
[contenteditable="true"]:focus { background: rgba(249, 115, 22, 0.1); box-shadow: inset 0 0 0 2px var(--primary); }

.table-wrapper { position: relative; width: 100%; margin-top: 10px; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); border: 1px solid var(--slate-200); background: white; }
.custom-table { width: 100%; border-collapse: collapse; font-size: 16px; text-align: left; table-layout: fixed; }
.custom-table th, .custom-table td { padding: 15px 20px; border-bottom: 1px solid var(--slate-200); border-right: 1px solid var(--slate-200); position: relative;}
.custom-table th:last-child, .custom-table td:last-child { border-right: none; }
.custom-table thead tr { background-color: #fff7ed !important; color: #ea580c !important; }
.custom-table th { font-weight: 800; text-transform: uppercase; font-size: 14px; letter-spacing: 0.5px; border-bottom: 2px solid var(--primary) !important;}
.custom-table tbody tr:hover { background-color: #f8fafc; }

.col-resizer { position: absolute; top: 0; right: 0; width: 5px; cursor: col-resize; user-select: none; height: 100%; z-index: 10; }
.col-resizer:hover, .col-resizer.resizing { background-color: var(--primary); }
.th-content { width: 100%; outline: none; }

.table-controls { position: absolute; top: -45px; right: 0; display: flex; gap: 8px; opacity: 0; transition: 0.3s; }
.table-wrapper:hover .table-controls { opacity: 1; }
.slide-section.idle .table-controls { opacity: 0 !important; pointer-events: none; }
.tc-btn { background: white; border: 1px solid var(--primary); color: var(--primary); padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Be Vietnam Pro'; box-shadow: 0 2px 5px rgba(249, 115, 22, 0.2); transition: 0.2s; }
.tc-btn:hover { background: var(--primary); color: white; }
.tc-btn.del { border-color: var(--danger); color: var(--danger); box-shadow: 0 2px 5px rgba(239, 68, 68, 0.2); }
.tc-btn.del:hover { background: var(--danger); color: white; }

.status-box { background: var(--slate-100); padding: 12px; border-radius: 12px; text-align: center; border: 1px solid var(--slate-200); }
.auto-save-indicator { font-size: 11px; font-weight: 700; color: var(--text-sec); transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 6px;}
.auto-save-indicator.active { color: #10b981; }
.auto-save-indicator.saving { color: var(--primary); }

@keyframes fadeOut { 0% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; display: none; } }
`;

const htmlContent = `
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
        <div class="main-menu hidden" id="main-menu">
            <h4 style="margin:0 0 5px 0; font-size:14px; font-weight:800; color:var(--text-main); text-transform:uppercase;">Control Panel</h4>
            
            <div class="status-box">
                <label style="font-size:10px; font-weight:800; color:var(--text-sec); display:block; margin-bottom:8px; text-transform:uppercase;">Thu phóng Slide: <span id="zoom-txt" style="color:var(--primary);">100%</span></label>
                <input type="range" min="0.3" max="1.5" step="0.05" value="1" style="width:100%; accent-color:var(--primary);" id="zoom-range">
            </div>

            <!-- Nút TẠO BÁO CÁO MỚI -->
            <button class="btn btn-new" onclick="window.createNewReportTemplate()"><i class="fa-solid fa-file-medical"></i> TẠO BÁO CÁO MỚI (TRẮNG)</button>
            <button class="btn btn-save" onclick="window.handleSaveRequest()"><i class="fa-solid fa-cloud-arrow-up"></i> LƯU BÁO CÁO</button>
            <button class="btn btn-pdf" onclick="window.print()"><i class="fa-solid fa-file-pdf"></i> XUẤT FILE PDF</button>
            
            <div class="auto-save-indicator" id="auto-save-text">
                <i class="fa-solid fa-circle-info"></i> Lưu báo cáo lần đầu để bật Tự Động Lưu
            </div>
            
            <hr style="width:100%; border:none; border-top:1px solid #f1f5f9; margin:0;">
            <div style="display:flex; gap:8px;">
                <button class="btn" style="background:var(--white); border:1px solid var(--slate-200); color:var(--text-main); padding:10px;" onclick="window.addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-plus"></i> Slide</button>
                <button class="btn" style="background:var(--white); border:1px solid var(--slate-200); color:var(--text-main); padding:10px;" onclick="window.addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-link"></i> App</button>
            </div>
        </div>
    </div>

    <!-- KHU VỰC TRÌNH BÀY -->
    <div id="deck-zoom-container">
        <div id="deck-container" style="display: flex; flex-direction: column; gap: 70px; align-items: center; width: 100%;">

            <!-- SLIDE 1: BÌA -->
            <div class="slide-container hero-slide" id="slide-1">
                <button class="edit-overlay no-print" onclick="window.changeHeroBg(this)">
                    <i class="fa-solid fa-camera"></i> Đổi ảnh nền
                </button>
                <div class="slide-actions no-print">
                    <button class="act-btn" onclick="window.addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-file-circle-plus"></i></button>
                    <button class="act-btn" onclick="window.addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-object-group"></i></button>
                </div>
                
                <div class="hero-content">
                    <h3 contenteditable="true">BÁO CÁO HOẠT ĐỘNG MARKETING</h3>
                    <h1 contenteditable="true">THE WIN CITY</h1>
                    <p contenteditable="true">Tuần: 20/04/2026 – 26/04/2026</p>
                </div>
            </div>

            <!-- SLIDE 2: NGÂN SÁCH -->
            <div class="slide-container" id="slide-2">
                <div class="slide-actions no-print">
                    <button class="act-btn" style="color:#10b981;" onclick="window.addBudgetCard(this)" title="Thêm thẻ ngân sách"><i class="fa-solid fa-plus"></i></button>
                    <button class="act-btn" onclick="window.addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-file-circle-plus"></i></button>
                    <button class="act-btn" onclick="window.addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-object-group"></i></button>
                    <button class="act-btn del" onclick="this.closest('.slide-container').remove()" title="Xóa Slide"><i class="fa-solid fa-trash-can"></i></button>
                </div>
                
                <h2 class="slide-title" contenteditable="true">BÁO CÁO NGÂN SÁCH CHI TIẾT</h2>
                <div class="slide-content-area">
                    <div class="budget-grid">
                        <div class="budget-card card-approved">
                            <div class="card-header"><span class="label" contenteditable="true">Ngân sách được duyệt</span><div class="card-icon"><i class="fa-solid fa-sack-dollar"></i></div></div>
                            <div class="amount auto-format" contenteditable="true">65.000.000.000</div>
                        </div>
                        <div class="budget-card card-signed">
                            <div class="card-header"><span class="label" contenteditable="true">Giá trị hợp đồng đã ký</span><div class="card-icon"><i class="fa-solid fa-file-signature"></i></div></div>
                            <div class="amount auto-format" contenteditable="true">39.028.549.837</div>
                        </div>
                        <div class="budget-card card-remain">
                            <div class="card-header"><span class="label" contenteditable="true">Ngân sách còn lại (Dự phòng)</span><div class="card-icon"><i class="fa-solid fa-vault"></i></div></div>
                            <div class="amount auto-format" contenteditable="true">24.997.017.363</div>
                        </div>
                        <div class="budget-card card-spent">
                            <div class="card-header"><span class="label" contenteditable="true">Đang giải ngân (Số dư HĐ)</span><div class="card-icon"><i class="fa-solid fa-money-bill-transfer"></i></div></div>
                            <div class="amount auto-format" contenteditable="true">05.525.366.190</div>
                        </div>
                    </div>
                </div>
                <p contenteditable="true" style="margin-top:auto; font-size:13px; color:var(--text-sec); text-align:right; font-style:italic;">* Nhập trực tiếp số liệu vào các ô trên. Tự động định dạng hàng nghìn. (Bấm dấu + ở góc để thêm thẻ)</p>
            </div>

        </div>
    </div>

    <!-- TEMPLATES -->
    <template id="tpl-default-deck">
        <!-- SLIDE 1: BÌA -->
        <div class="slide-container hero-slide" id="slide-1">
            <button class="edit-overlay no-print" onclick="window.changeHeroBg(this)">
                <i class="fa-solid fa-camera"></i> Đổi ảnh nền
            </button>
            <div class="slide-actions no-print">
                <button class="act-btn" onclick="window.addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-file-circle-plus"></i></button>
                <button class="act-btn" onclick="window.addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-object-group"></i></button>
            </div>
            <div class="hero-content">
                <h3 contenteditable="true">BÁO CÁO HOẠT ĐỘNG MARKETING</h3>
                <h1 contenteditable="true">THE WIN CITY</h1>
                <p contenteditable="true">Tuần: --/--/2026 – --/--/2026</p>
            </div>
        </div>

        <!-- SLIDE 2: NGÂN SÁCH -->
        <div class="slide-container" id="slide-2">
            <div class="slide-actions no-print">
                <button class="act-btn" style="color:#10b981;" onclick="window.addBudgetCard(this)" title="Thêm thẻ ngân sách"><i class="fa-solid fa-plus"></i></button>
                <button class="act-btn" onclick="window.addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-file-circle-plus"></i></button>
                <button class="act-btn" onclick="window.addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-object-group"></i></button>
                <button class="act-btn del" onclick="this.closest('.slide-container').remove()" title="Xóa Slide"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <h2 class="slide-title" contenteditable="true">BÁO CÁO NGÂN SÁCH CHI TIẾT</h2>
            <div class="slide-content-area">
                <div class="budget-grid">
                    <div class="budget-card card-approved">
                        <div class="card-header"><span class="label" contenteditable="true">Ngân sách được duyệt</span><div class="card-icon"><i class="fa-solid fa-sack-dollar"></i></div></div>
                        <div class="amount auto-format" contenteditable="true">0</div>
                    </div>
                    <div class="budget-card card-signed">
                        <div class="card-header"><span class="label" contenteditable="true">Giá trị hợp đồng đã ký</span><div class="card-icon"><i class="fa-solid fa-file-signature"></i></div></div>
                        <div class="amount auto-format" contenteditable="true" style="color:var(--text-main)">0</div>
                    </div>
                    <div class="budget-card card-remain">
                        <div class="card-header"><span class="label" contenteditable="true">Ngân sách còn lại (Dự phòng)</span><div class="card-icon"><i class="fa-solid fa-vault"></i></div></div>
                        <div class="amount auto-format" contenteditable="true" style="color:#10b981">0</div>
                    </div>
                    <div class="budget-card card-spent">
                        <div class="card-header"><span class="label" contenteditable="true">Đang giải ngân (Số dư HĐ)</span><div class="card-icon"><i class="fa-solid fa-money-bill-transfer"></i></div></div>
                        <div class="amount auto-format" contenteditable="true" style="color:#ef4444">0</div>
                    </div>
                </div>
            </div>
            <p contenteditable="true" style="margin-top:auto; font-size:13px; color:var(--text-sec); text-align:right; font-style:italic;">* Nhập trực tiếp số liệu vào các ô trên. Tự động định dạng hàng nghìn.</p>
        </div>
    </template>

    <template id="tpl-blank">
        <div class="slide-container">
            <div class="slide-actions no-print">
                <button class="act-btn" style="color:var(--primary);" onclick="window.addTable(this)" title="Chèn Bảng"><i class="fa-solid fa-table"></i></button>
                <button class="act-btn" onclick="window.addDriveGrid(this)" title="Chèn ảnh Drive"><i class="fa-brands fa-google-drive"></i></button>
                <button class="act-btn" onclick="window.addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-file-circle-plus"></i></button>
                <button class="act-btn" onclick="window.addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-object-group"></i></button>
                <button class="act-btn del" onclick="this.closest('.slide-container').remove()" title="Xóa Slide"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <h2 class="slide-title" contenteditable="true">TIÊU ĐỀ SLIDE MỚI</h2>
            <div class="slide-content-area">
                <p contenteditable="true" style="color:var(--text-sec); font-style:italic;">Bấm vào đây để nhập nội dung, hoặc dùng nút chức năng góc phải để chèn bảng/hình ảnh...</p>
            </div>
        </div>
    </template>

    <template id="tpl-app">
        <div class="slide-container slide-full-app">
            <button class="edit-overlay no-print" onclick="window.connectIframe(this)">
                <i class="fa-solid fa-link"></i> Đổi Link App
            </button>
            <div class="slide-actions no-print" style="z-index:1000;">
                <button class="act-btn" onclick="window.addNewSlide('blank')" title="Thêm Slide Trắng"><i class="fa-solid fa-file-circle-plus"></i></button>
                <button class="act-btn" onclick="window.addNewSlide('app')" title="Thêm Slide App"><i class="fa-solid fa-object-group"></i></button>
                <button class="act-btn del" onclick="this.closest('.slide-container').remove()" title="Xóa Slide"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <div class="app-iframe-container">
                <iframe src="about:blank"></iframe>
            </div>
        </div>
    </template>
`;