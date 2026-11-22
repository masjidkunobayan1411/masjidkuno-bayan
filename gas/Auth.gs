/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Autentikasi Pengelola & Manajemen Akun Admin
 * File: gas/Auth.gs
 * ============================================================================
 * 
 * Modul ini menangani verifikasi kredensial login admin menggunakan hash SHA-256
 * dengan salt aman, otorisasi role berbasis server (SUPER_ADMIN vs ADMIN),
 * pencatatan sesi login ke LOG_AKTIVITAS, serta administrasi akun pengelola.
 */

var Auth = (function() {
  /**
   * Sanitasi data admin sebelum dikembalikan ke client
   * Jika includePassword true (hanya untuk Super Admin), sertakan password_display
   */
  function sanitizeAdminOutput_(admin, includePassword) {
    if (!admin) return null;
    var output = {
      admin_id: admin.admin_id,
      nama: admin.nama,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      dibuat_pada: admin.dibuat_pada,
      terakhir_login: admin.terakhir_login
    };
    if (includePassword) {
      output.password_display = admin.password_display || admin.password || '••••••••';
    }
    return output;
  }

  /**
   * Autentikasi Login Admin
   * 
   * Payload:
   * {
   *   "email": "admin@bayan.id",
   *   "password": "Password123"
   * }
   */
  function login(payload) {
    var email = String(payload.email || '').toLowerCase().trim();
    var password = String(payload.password || '');

    if (!email || !password) {
      return Response.error('Email dan password wajib diisi.');
    }

    // 1. Cari Akun Admin Berdasarkan Email
    var admins = Database.findAll('ADMIN', function(adm) {
      return String(adm.email).toLowerCase().trim() === email;
    });

    if (admins.length === 0) {
      // Catat percobaan login gagal
      ActivityLog.record('SYSTEM', 'LOGIN_FAILED', 'ADMIN', email, 'Email tidak terdaftar');
      return Response.error('Email atau password tidak sesuai.');
    }

    var admin = admins[0];

    // 2. Periksa Status Akun
    if (admin.status !== CONFIG.STATUS.ADMIN.AKTIF) {
      ActivityLog.record(admin.admin_id, 'LOGIN_BLOCKED', 'ADMIN', admin.admin_id, 'Akun nonaktif mencoba login');
      return Response.error('Akun Anda sedang dinonaktifkan. Silakan hubungi Super Admin.');
    }

    // 3. Verifikasi Password Hash (SHA-256 + Salt)
    var isPasswordValid = Utils.verifyPassword(password, admin.password_hash);
    if (!isPasswordValid) {
      ActivityLog.record(admin.admin_id, 'LOGIN_FAILED', 'ADMIN', admin.admin_id, 'Password salah');
      return Response.error('Email atau password tidak sesuai.');
    }

    // 4. Perbarui Timestamp Terakhir Login (WITA)
    var nowWita = Utils.getNowWitaIsoString();
    Database.updateById('ADMIN', admin.admin_id, {
      terakhir_login: nowWita
    });

    // 5. Catat Audit Log Keberhasilan Login
    ActivityLog.record(admin.admin_id, 'LOGIN_SUCCESS', 'ADMIN', admin.admin_id, 'Login berhasil (' + admin.role + ')');

    admin.terakhir_login = nowWita;

    return Response.success(sanitizeAdminOutput_(admin), 'Login berhasil');
  }

  /**
   * Membuat Akun Admin Baru (Hanya Super Admin)
   */
  function createAdmin(payload, currentAdminRole, currentAdminId) {
    // 1. Otorisasi: Hanya Super Admin
    var authCheck = Security.authorizeRole(currentAdminRole, CONFIG.STATUS.ROLES.SUPER_ADMIN);
    if (!authCheck.authorized) {
      return Response.error(authCheck.message);
    }

    // 2. Validasi Data Akun
    var email = String(payload.email || '').toLowerCase().trim();
    var nama = String(payload.nama || '').trim();
    var password = String(payload.password || '');
    var role = String(payload.role || CONFIG.STATUS.ROLES.ADMIN).toUpperCase().trim();

    if (!nama || nama.length < 3) {
      return Response.error('Nama lengkap admin minimal 3 karakter.');
    }
    if (!Utils.isValidEmail(email)) {
      return Response.error('Format email tidak valid.');
    }
    if (!password || password.length < 6) {
      return Response.error('Password minimal 6 karakter.');
    }
    if (role !== CONFIG.STATUS.ROLES.SUPER_ADMIN && role !== CONFIG.STATUS.ROLES.ADMIN) {
      return Response.error('Role tidak valid. Pilihan: SUPER_ADMIN atau ADMIN.');
    }

    return Database.withLock(function() {
      // 3. Periksa Keunikan Email
      var existing = Database.findAll('ADMIN', function(adm) {
        return String(adm.email).toLowerCase().trim() === email;
      });

      if (existing.length > 0) {
        return Response.error('Email [' + email + '] sudah terdaftar.');
      }

      // 4. Hash Password
      var passwordHash = Utils.hashPassword(password);

      var newAdmin = {
        nama: nama,
        email: email,
        password_hash: passwordHash,
        password_display: password,
        role: role,
        status: CONFIG.STATUS.ADMIN.AKTIF,
        terakhir_login: '-'
      };

      var saved = Database.insert('ADMIN', newAdmin);

      ActivityLog.record(
        currentAdminId || 'SUPER_ADMIN',
        'CREATE_ADMIN',
        'ADMIN',
        saved.admin_id,
        'Membuat akun admin baru: ' + saved.nama + ' (' + saved.role + ')'
      );

      return Response.success(sanitizeAdminOutput_(saved, true), 'Akun admin berhasil dibuat');
    });
  }

  /**
   * Mengubah Data / Status Akun Admin (Hanya Super Admin)
   */
  function updateAdmin(payload, currentAdminRole, currentAdminId) {
    var authCheck = Security.authorizeRole(currentAdminRole, CONFIG.STATUS.ROLES.SUPER_ADMIN);
    if (!authCheck.authorized) {
      return Response.error(authCheck.message);
    }

    var targetId = payload.admin_id;
    if (!targetId) {
      return Response.error('admin_id wajib disertakan.');
    }

    return Database.withLock(function() {
      var target = Database.findById('ADMIN', targetId);
      if (!target) {
        return Response.error('Admin dengan ID [' + targetId + '] tidak ditemukan.');
      }

      var updateFields = {};

      if (payload.nama) {
        updateFields.nama = String(payload.nama).trim();
      }
      if (payload.status) {
        var st = String(payload.status).toUpperCase().trim();
        if (st === CONFIG.STATUS.ADMIN.AKTIF || st === CONFIG.STATUS.ADMIN.NONAKTIF) {
          updateFields.status = st;
        }
      }
      if (payload.role) {
        var r = String(payload.role).toUpperCase().trim();
        if (r === CONFIG.STATUS.ROLES.SUPER_ADMIN || r === CONFIG.STATUS.ROLES.ADMIN) {
          updateFields.role = r;
        }
      }
      if (payload.password && String(payload.password).length >= 6) {
        updateFields.password_hash = Utils.hashPassword(String(payload.password));
        updateFields.password_display = String(payload.password);
      }

      var updated = Database.updateById('ADMIN', targetId, updateFields);

      ActivityLog.record(
        currentAdminId || 'SUPER_ADMIN',
        'UPDATE_ADMIN',
        'ADMIN',
        targetId,
        'Pembaruan akun admin: ' + updated.nama
      );

      return Response.success(sanitizeAdminOutput_(updated, true), 'Akun admin berhasil diperbarui');
    });
  }

  /**
   * Menghapus Akun Admin Secara Permanen (Hanya Super Admin)
   */
  function deleteAdmin(adminId, currentAdminRole, currentAdminId) {
    var authCheck = Security.authorizeRole(currentAdminRole, CONFIG.STATUS.ROLES.SUPER_ADMIN);
    if (!authCheck.authorized) {
      return Response.error(authCheck.message);
    }

    if (!adminId) {
      return Response.error('admin_id wajib disertakan.');
    }

    if (adminId === currentAdminId) {
      return Response.error('Anda tidak dapat menghapus akun Anda sendiri.');
    }

    return Database.withLock(function() {
      var target = Database.findById('ADMIN', adminId);
      if (!target) {
        return Response.error('Akun admin dengan ID [' + adminId + '] tidak ditemukan.');
      }

      // Pastikan bukan satu-satunya Super Admin
      if (target.role === CONFIG.STATUS.ROLES.SUPER_ADMIN) {
        var allAdmins = Database.findAll('ADMIN');
        var superAdminCount = allAdmins.filter(function(a) {
          return a.role === CONFIG.STATUS.ROLES.SUPER_ADMIN && a.admin_id !== adminId;
        }).length;
        if (superAdminCount < 1) {
          return Response.error('Tidak dapat menghapus satu-satunya akun Super Admin.');
        }
      }

      var deleted = Database.deleteById('ADMIN', adminId);

      ActivityLog.record(
        currentAdminId || 'SUPER_ADMIN',
        'DELETE_ADMIN',
        'ADMIN',
        adminId,
        'Penghapusan akun admin: ' + (deleted.nama || adminId) + ' (' + deleted.email + ')'
      );

      return Response.success(sanitizeAdminOutput_(deleted, false), 'Akun admin berhasil dihapus');
    });
  }

  /**
   * Mengambil Daftar Seluruh Akun Admin (Hanya Super Admin)
   */
  function listAdmins(currentAdminRole) {
    var authCheck = Security.authorizeRole(currentAdminRole, CONFIG.STATUS.ROLES.SUPER_ADMIN);
    if (!authCheck.authorized) {
      return Response.error(authCheck.message);
    }

    var admins = Database.findAll('ADMIN');
    var isSuper = currentAdminRole === CONFIG.STATUS.ROLES.SUPER_ADMIN;
    var sanitizedList = admins.map(function(adm) {
      return sanitizeAdminOutput_(adm, isSuper);
    });

    return Response.success(sanitizedList, 'Daftar akun admin');
  }

  /**
   * Inisialisasi Akun Super Admin Pertama Kali (Bootstrap)
   * Hanya diizinkan jika sheet ADMIN masih kosong untuk memudahkan setup awal pengelola
   */
  function bootstrapInitialSuperAdmin(payload) {
    return Database.withLock(function() {
      var existingAdmins = Database.findAll('ADMIN');
      var hasSuperAdmin = existingAdmins.some(function(adm) {
        return adm.role === CONFIG.STATUS.ROLES.SUPER_ADMIN && adm.status === CONFIG.STATUS.ADMIN.AKTIF;
      });

      if (hasSuperAdmin) {
        return Response.error('Super Admin aktif sudah ada pada sistem. Bootstrap ditolak.');
      }

      var email = String(payload.email || 'admin@bayan.id').toLowerCase().trim();
      var nama = String(payload.nama || 'Super Admin Bayan').trim();
      var password = String(payload.password || 'Bayan2026!Sec');

      var passwordHash = Utils.hashPassword(password);

      var superAdminRecord = {
        nama: nama,
        email: email,
        password_hash: passwordHash,
        role: CONFIG.STATUS.ROLES.SUPER_ADMIN,
        status: CONFIG.STATUS.ADMIN.AKTIF,
        terakhir_login: '-'
      };

      var saved = Database.insert('ADMIN', superAdminRecord);

      ActivityLog.record(
        saved.admin_id,
        'BOOTSTRAP_SUPER_ADMIN',
        'ADMIN',
        saved.admin_id,
        'Inisialisasi akun Super Admin perdana'
      );

      return Response.success(sanitizeAdminOutput_(saved), 'Akun Super Admin perdana berhasil dibuat');
    });
  }

  return {
    login: login,
    createAdmin: createAdmin,
    updateAdmin: updateAdmin,
    deleteAdmin: deleteAdmin,
    listAdmins: listAdmins,
    bootstrapInitialSuperAdmin: bootstrapInitialSuperAdmin
  };
})();
