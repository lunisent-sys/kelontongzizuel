// ================== SUPABASE CONFIG ==================
const SUPABASE_URL = 'https://pfwhpewpqjbedxxyfxjr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmd2hwZXdwcWpiZWR4eHlmeGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjI0ODEsImV4cCI6MjA4OTIzODQ4MX0.TOxdSebeKuciVtVi_ea-LHjKkRg7_cMv5xb60Nk6jhM';

// Inisialisasi Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================== STATE ==================
let currentUser = null;
let currentMusic = null;
let audioPlayer = null;

// ================== DOM ELEMENTS ==================
const navHome = document.getElementById('navHome');
const navLogin = document.getElementById('navLogin');
const navLogout = document.getElementById('navLogout');
const mainEl = document.getElementById('mainContent');
const discordLink = document.getElementById('discordLink');

// ================== KONSTANTA ==================
const ADMIN_USERNAME = "ownerzizuel";
const ADMIN_PASSWORD = "tokokelontongzizuel";
const WA_NUMBER = "62895630307497";

// ================== HELPER FUNCTIONS ==================
function escapeHtml(text) {
    if (!text) return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRupiah(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function updateLogoDisplay(logoUrl) {
    const logoImg = document.getElementById('storeLogo');
    if (logoImg && logoUrl) {
        logoImg.src = logoUrl;
    }
}

// ================== SUPABASE FUNCTIONS ==================
async function loadProducts() {
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

async function loadSettings() {
    try {
        const { data, error } = await supabaseClient
            .from('settings')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        return data || {
            store_header: 'Semua produk terbaru dari tokokelontongzizuel',
            store_logo: '',
            music_url: '',
            music_name: ''
        };
    } catch (error) {
        console.error('Error loading settings:', error);
        return {
            store_header: 'Semua produk terbaru dari tokokelontongzizuel',
            store_logo: '',
            music_url: '',
            music_name: ''
        };
    }
}

async function saveProduct(product) {
    const { data, error } = await supabaseClient
        .from('products')
        .insert([{
            nama: product.nama,
            harga: product.harga,
            deskripsi: product.deskripsi || '',
            image: product.image || '',
            user_id: currentUser?.username || 'admin'
        }])
        .select();
    
    if (error) throw error;
    return data;
}

async function updateProduct(id, updates) {
    const { error } = await supabaseClient
        .from('products')
        .update(updates)
        .eq('id', id);
    
    if (error) throw error;
}

async function deleteProduct(id) {
    const { error } = await supabaseClient
        .from('products')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
}

async function saveSettings(settings) {
    const { error } = await supabaseClient
        .from('settings')
        .upsert({
            id: 1,
            store_header: settings.store_header,
            store_logo: settings.store_logo,
            music_url: settings.music_url,
            music_name: settings.music_name
        });
    
    if (error) throw error;
}

// ================== USER MANAGEMENT (LocalStorage) ==================
let users = [];

function loadUsers() {
    const stored = localStorage.getItem("tokozizuel_users");
    if (stored) {
        try {
            users = JSON.parse(stored);
        } catch (e) {}
    }
    
    if (!users) users = [];
    
    const adminExists = users.some(u => u.username === ADMIN_USERNAME);
    if (!adminExists) {
        users.push({
            username: ADMIN_USERNAME,
            password: ADMIN_PASSWORD,
            email: "admin@zizuel.local",
            role: "admin"
        });
    }
    
    saveUsers();
}

function saveUsers() {
    localStorage.setItem("tokozizuel_users", JSON.stringify(users));
}

loadUsers();

// ================== MUSIC PLAYER ==================
function playMusic(url, name) {
    const existingPlayer = document.getElementById('globalMusicPlayer');
    if (existingPlayer) existingPlayer.remove();
    
    if (!url) return;
    
    const playerDiv = document.createElement('div');
    playerDiv.id = 'globalMusicPlayer';
    playerDiv.className = 'music-player';
    playerDiv.innerHTML = `
        <i class="fas fa-music" style="color:#7f9fff"></i>
        <audio controls autoplay loop>
            <source src="${url}" type="audio/mpeg">
        </audio>
        <span class="text-muted">${escapeHtml(name || 'musik latar')}</span>
    `;
    
    const footer = document.querySelector('.footer');
    footer.parentNode.insertBefore(playerDiv, footer);
}

// ================== PAGES ==================
async function showHome() {
    if (!currentUser) {
        showAuth();
        return;
    }
    
    mainEl.innerHTML = '<div style="text-align:center; padding:3rem;">Loading produk...</div>';
    
    const products = await loadProducts();
    const settings = await loadSettings();
    
    updateLogoDisplay(settings.store_logo);
    
    let html = `
        <div class="card">
            <div style="margin-bottom: 2rem;">
                <h1 style="font-size: 1.8rem; font-weight: 500; margin-bottom: 0.5rem;">${escapeHtml(settings.store_header)}</h1>
                <p class="text-muted">selamat berbelanja, ${escapeHtml(currentUser.username)}</p>
            </div>
    `;
    
    if (products.length === 0) {
        html += `<p class="text-muted" style="text-align: center; padding: 3rem;">belum ada produk</p>`;
    } else {
        html += `<div class="products-grid">`;
        products.forEach(prod => {
            const waText = `Permisi, saya ingin membeli ${encodeURIComponent(prod.nama)} senilai Rp ${prod.harga}`;
            html += `
                <div class="product-item">
                    <img class="product-image" src="${prod.image || 'https://via.placeholder.com/240x150/1a2335/7f9fff?text=zizuel'}" 
                         onerror="this.src='https://via.placeholder.com/240x150/1a2335/7f9fff?text=zizuel'">
                    <div class="product-name">${escapeHtml(prod.nama)}</div>
                    <div class="product-desc">${escapeHtml(prod.deskripsi) || '—'}</div>
                    <div class="product-price">Rp ${formatRupiah(prod.harga)}</div>
                    <a class="wa-order" href="https://wa.me/${WA_NUMBER}?text=${waText}" target="_blank">
                        <i class="fab fa-whatsapp"></i> beli via whatsapp
                    </a>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    html += `</div>`;
    mainEl.innerHTML = html;
    
    if (currentUser.role === 'admin') {
        addAdminButton();
    }
    
    if (settings.music_url) {
        playMusic(settings.music_url, settings.music_name);
    }
    
    updateNav();
}

function addAdminButton() {
    const adminBtn = document.createElement('button');
    adminBtn.className = 'btn';
    adminBtn.style.marginTop = '2rem';
    adminBtn.innerHTML = '<i class="fas fa-cog"></i> panel admin';
    adminBtn.onclick = showAdmin;
    mainEl.querySelector('.card').appendChild(adminBtn);
}

async function showAdmin() {
    if (!currentUser || currentUser.role !== 'admin') {
        showHome();
        return;
    }
    
    const settings = await loadSettings();
    const products = await loadProducts();
    
    let html = `
        <div class="card">
            <h2 class="section-title">⚙️ panel admin</h2>
            
            <div class="admin-section">
                <h3 class="section-title">teks halaman</h3>
                <div class="form-group">
                    <input type="text" id="headerText" class="input-field" value="${escapeHtml(settings.store_header)}" placeholder="teks di atas produk">
                </div>
                <button class="btn" id="saveHeaderBtn">simpan teks</button>
            </div>
            
            <div class="admin-section">
                <h3 class="section-title">logo toko</h3>
                <div class="form-group">
                    <label class="file-upload">
                        <i class="fas fa-upload"></i> pilih gambar logo
                        <input type="file" id="logoUpload" accept="image/*">
                    </label>
                    <span class="file-name" id="logoFileName">${settings.store_logo ? 'logo tersedia' : 'belum ada logo'}</span>
                </div>
                <button class="btn" id="saveLogoBtn">simpan logo</button>
            </div>
            
            <div class="admin-section">
                <h3 class="section-title">musik latar (auto play)</h3>
                <div class="form-group">
                    <label class="file-upload">
                        <i class="fas fa-music"></i> pilih file MP3
                        <input type="file" id="musicUpload" accept="audio/mpeg">
                    </label>
                    <span class="file-name" id="musicFileName">${settings.music_name || 'belum ada musik'}</span>
                </div>
                ${settings.music_url ? `
                    <audio controls style="width:100%; margin-top:1rem;">
                        <source src="${settings.music_url}" type="audio/mpeg">
                    </audio>
                ` : ''}
                <button class="btn" id="saveMusicBtn" style="margin-top:1rem;">simpan musik</button>
            </div>
            
            <div class="admin-section">
                <h3 class="section-title">tambah produk</h3>
                <div class="form-group">
                    <input type="text" id="prodName" class="input-field" placeholder="nama produk">
                </div>
                <div class="form-row">
                    <input type="number" id="prodPrice" class="input-field" placeholder="harga">
                    <input type="text" id="prodDesc" class="input-field" placeholder="deskripsi singkat">
                </div>
                <div class="form-group">
                    <label class="file-upload">
                        <i class="fas fa-image"></i> gambar produk
                        <input type="file" id="prodImage" accept="image/*">
                    </label>
                    <span class="file-name" id="prodImageName">tidak ada</span>
                </div>
                <button class="btn" id="addProductBtn">tambah produk</button>
            </div>
            
            <div class="admin-section">
                <h3 class="section-title">daftar produk</h3>
                <div class="product-list-admin">
    `;
    
    if (products.length === 0) {
        html += `<p class="text-muted">belum ada produk</p>`;
    } else {
        products.forEach(prod => {
            html += `
                <div class="admin-product-row">
                    <div class="admin-product-info">
                        <span style="font-weight:500;">${escapeHtml(prod.nama)}</span>
                        <span class="text-muted">Rp ${formatRupiah(prod.harga)}</span>
                    </div>
                    <div class="admin-product-actions">
                        <button class="btn-small" onclick="editProduct('${prod.id}')">edit</button>
                        <button class="btn-small" onclick="deleteProduct('${prod.id}')">hapus</button>
                    </div>
                </div>
            `;
        });
    }
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    mainEl.innerHTML = html;
    attachAdminEvents();
    updateNav();
}

function attachAdminEvents() {
    document.getElementById('saveHeaderBtn')?.addEventListener('click', async () => {
        const newHeader = document.getElementById('headerText').value.trim();
        if (newHeader) {
            await saveSettings({ store_header: newHeader });
            alert('teks berhasil disimpan');
        }
    });
    
    document.getElementById('logoUpload')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                await saveSettings({ store_logo: event.target.result });
                document.getElementById('logoFileName').textContent = file.name;
                updateLogoDisplay(event.target.result);
                alert('logo berhasil disimpan');
            };
            reader.readAsDataURL(file);
        }
    });
    
    document.getElementById('musicUpload')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type === 'audio/mpeg') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                await saveSettings({ 
                    music_url: event.target.result,
                    music_name: file.name 
                });
                document.getElementById('musicFileName').textContent = file.name;
                playMusic(event.target.result, file.name);
                alert('musik berhasil disimpan');
            };
            reader.readAsDataURL(file);
        } else {
            alert('hanya file MP3 yang diperbolehkan');
        }
    });
    
    document.getElementById('addProductBtn')?.addEventListener('click', () => {
        const name = document.getElementById('prodName').value.trim();
        const price = document.getElementById('prodPrice').value.trim();
        const desc = document.getElementById('prodDesc').value.trim();
        const imageFile = document.getElementById('prodImage').files[0];
        
        if (!name || !price) {
            alert('nama dan harga harus diisi');
            return;
        }
        
        if (imageFile && imageFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                addProduct(name, price, desc, e.target.result);
            };
            reader.readAsDataURL(imageFile);
        } else {
            addProduct(name, price, desc, null);
        }
    });
}

async function addProduct(name, price, desc, imageData) {
    try {
        await saveProduct({
            nama: name,
            harga: parseInt(price) || 0,
            deskripsi: desc || '',
            image: imageData || 'https://via.placeholder.com/240x150/1a2335/7f9fff?text=zizuel'
        });
        
        alert('produk ditambahkan');
        showAdmin();
    } catch (error) {
        alert('gagal menambah produk: ' + error.message);
    }
}

window.editProduct = async (id) => {
    const products = await loadProducts();
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    
    const newName = prompt('nama produk:', prod.nama);
    if (newName === null) return;
    
    const newPrice = prompt('harga:', prod.harga);
    if (newPrice === null) return;
    
    const newDesc = prompt('deskripsi:', prod.deskripsi || '');
    
    try {
        await updateProduct(id, {
            nama: newName.trim() || prod.nama,
            harga: parseInt(newPrice) || prod.harga,
            deskripsi: newDesc || prod.deskripsi
        });
        alert('produk diperbarui');
        showAdmin();
    } catch (error) {
        alert('gagal update: ' + error.message);
    }
};

window.deleteProduct = async (id) => {
    if (!confirm('hapus produk ini?')) return;
    
    try {
        await deleteProduct(id);
        showAdmin();
    } catch (error) {
        alert('gagal menghapus: ' + error.message);
    }
};

function showAuth() {
    const html = `
        <div class="auth-container">
            <div class="auth-tabs">
                <button class="auth-tab active" id="tabLogin">masuk</button>
                <button class="auth-tab" id="tabRegister">daftar</button>
            </div>
            
            <div id="loginPanel">
                <div class="form-group">
                    <input type="text" id="loginUsername" class="input-field" placeholder="username">
                </div>
                <div class="form-group">
                    <input type="password" id="loginPassword" class="input-field" placeholder="password">
                </div>
                <button class="btn" id="doLogin" style="width:100%;">masuk</button>
                <div id="loginMessage"></div>
            </div>
            
            <div id="registerPanel" class="hidden">
                <div class="form-group">
                    <input type="text" id="regUsername" class="input-field" placeholder="username">
                </div>
                <div class="form-group">
                    <input type="email" id="regEmail" class="input-field" placeholder="email">
                </div>
                <div class="form-group">
                    <input type="password" id="regPassword" class="input-field" placeholder="password">
                </div>
                <button class="btn" id="doRegister" style="width:100%;">daftar</button>
                <div id="registerMessage"></div>
            </div>
        </div>
    `;
    
    mainEl.innerHTML = html;
    
    document.getElementById('tabLogin').addEventListener('click', () => {
        document.getElementById('tabLogin').classList.add('active');
        document.getElementById('tabRegister').classList.remove('active');
        document.getElementById('loginPanel').classList.remove('hidden');
        document.getElementById('registerPanel').classList.add('hidden');
    });
    
    document.getElementById('tabRegister').addEventListener('click', () => {
        document.getElementById('tabRegister').classList.add('active');
        document.getElementById('tabLogin').classList.remove('active');
        document.getElementById('registerPanel').classList.remove('hidden');
        document.getElementById('loginPanel').classList.add('hidden');
    });
    
    document.getElementById('doLogin').addEventListener('click', () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const msg = document.getElementById('loginMessage');
        
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            currentUser = { username: user.username, role: user.role };
            msg.innerHTML = '<div class="message-box success">berhasil masuk</div>';
            setTimeout(() => {
                showHome();
            }, 500);
        } else {
            msg.innerHTML = '<div class="message-box error">username/password salah</div>';
        }
    });
    
    document.getElementById('doRegister').addEventListener('click', () => {
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const msg = document.getElementById('registerMessage');
        
        if (!username || !email || !password) {
            msg.innerHTML = '<div class="message-box error">semua field harus diisi</div>';
            return;
        }
        
        if (users.some(u => u.username === username)) {
            msg.innerHTML = '<div class="message-box error">username sudah ada</div>';
            return;
        }
        
        if (!email.includes('@') || !email.includes('.')) {
            msg.innerHTML = '<div class="message-box error">email tidak valid</div>';
            return;
        }
        
        users.push({
            username,
            password,
            email,
            role: 'user'
        });
        
        saveUsers();
        msg.innerHTML = '<div class="message-box success">berhasil daftar, silakan masuk</div>';
        
        document.getElementById('regUsername').value = '';
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
        
        setTimeout(() => {
            document.getElementById('tabLogin').click();
        }, 1500);
    });
    
    updateNav();
}

function logout() {
    currentUser = null;
    const player = document.getElementById('globalMusicPlayer');
    if (player) player.remove();
    showAuth();
    updateNav();
}

function updateNav() {
    if (currentUser) {
        navLogin.classList.add('hidden');
        navLogout.classList.remove('hidden');
    } else {
        navLogin.classList.remove('hidden');
        navLogout.classList.add('hidden');
    }
}

// ================== EVENT LISTENERS ==================
navHome.addEventListener('click', showHome);
navLogin.addEventListener('click', showAuth);
navLogout.addEventListener('click', logout);

discordLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://discord.gg/example', '_blank');
});

// ================== INIT ==================
showAuth();
updateNav();
