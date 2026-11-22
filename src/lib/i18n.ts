/**
 * ============================================================================
 * SISTEM BAYAN VISITOR - MASJID KUNO BAYAN
 * Modul Lokalisasi & Bahasa (Multi-Language: ID / EN)
 * File: src/lib/i18n.ts
 * ============================================================================
 */

export type Language = "ID" | "EN";

export interface TranslationDict {
  nav: {
    home: string;
    history: string;
    rules: string;
    attire: string;
    location: string;
    register: string;
    adminLogin: string;
  };
  hero: {
    badge: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    registerCta: string;
    rulesCta: string;
    statAge: string;
    statAgeDesc: string;
    statHeritage: string;
    statHeritageDesc: string;
    statTimezone: string;
    statTimezoneDesc: string;
    statAttire: string;
    statAttireDesc: string;
  };
  history: {
    sectionBadge: string;
    title: string;
    subtitle: string;
    card1Title: string;
    card1Desc: string;
    card2Title: string;
    card2Desc: string;
    card3Title: string;
    card3Desc: string;
  };
  rules: {
    sectionBadge: string;
    title: string;
    subtitle: string;
    rule1Title: string;
    rule1Desc: string;
    rule2Title: string;
    rule2Desc: string;
    rule3Title: string;
    rule3Desc: string;
    rule4Title: string;
    rule4Desc: string;
    rule5Title: string;
    rule5Desc: string;
    rule6Title: string;
    rule6Desc: string;
  };
  attire: {
    sectionBadge: string;
    title: string;
    subtitle: string;
    item1Title: string;
    item1Category: string;
    item1Price: string;
    item1Desc: string;
    item2Title: string;
    item2Category: string;
    item2Price: string;
    item2Desc: string;
    item3Title: string;
    item3Category: string;
    item3Price: string;
    item3Desc: string;
    includedNotice: string;
  };
  location: {
    sectionBadge: string;
    title: string;
    subtitle: string;
    addressLabel: string;
    addressValue: string;
    hoursLabel: string;
    hoursValue: string;
    timezoneNotice: string;
    contactLabel: string;
    contactValue: string;
  };
  footer: {
    tagline: string;
    quickLinks: string;
    rulesNotice: string;
    copyright: string;
    rightsReserved: string;
  };
}

export const translations: Record<Language, TranslationDict> = {
  ID: {
    nav: {
      home: "Beranda",
      history: "Sejarah",
      rules: "Tata Tertib",
      attire: "Pakaian Adat",
      location: "Lokasi",
      register: "Daftar Kunjungan",
      adminLogin: "Portal Pengelola",
    },
    hero: {
      badge: "Situs Cagar Budaya Nasional Abad ke-16",
      title: "Selamat Datang di",
      titleHighlight: "Masjid Kuno Bayan",
      subtitle:
        "Saksi bisu peradaban dan penyebaran Islam tertua di Pulau Lombok. Nikmati keheningan spiritual, arsitektur bambu vernakular, dan kearifan masyarakat adat Bayan.",
      registerCta: "Daftar Registrasi Pengunjung",
      rulesCta: "Pelajari Tata Tertib Adat",
      statAge: "± 500 Tahun",
      statAgeDesc: "Berdiri Sejak Abad ke-16",
      statHeritage: "Cagar Budaya",
      statHeritageDesc: "Warisan Budaya Nasional",
      statTimezone: "09:00 - 17:00",
      statTimezoneDesc: "Buka Setiap Hari (WITA)",
      statAttire: "Wajib Busana Adat",
      statAttireDesc: "Tersedia Layanan Sewa",
    },
    history: {
      sectionBadge: "Warisan Sejarah & Kearifan Lokal",
      title: "Jejak Peradaban Leluhur Bayan",
      subtitle:
        "Menjaga keaslian adat dan keselarasan alam selama berabad-abad di tanah Sasak Lombok Utara.",
      card1Title: "Arsitektur Vernakular Alami",
      card1Desc:
        "Dibangun tanpa paku besi di atas bukit kecil. Dinding anyaman bambu (bedek), atap alang-alang dan ijuk, serta pondasi batu kali melambangkan hubungan harmonis manusia dengan alam semesta.",
      card2Title: "Pintu Masuk Dakwah Sasak",
      card2Desc:
        "Masjid Kuno Bayan menjadi episentrum sejarah awal penyebaran agama Islam di Pulau Lombok, berpadu harmonis dengan adat istiadat leluhur yang menjunjung tinggi toleransi dan perdamaian.",
      card3Title: "Kearifan Adat & Hutan Rinjani",
      card3Desc:
        "Masyarakat adat Bayan memegang teguh hukum adat dalam melestarikan mata air dan hutan lindung Gunung Rinjani, menciptakan tatanan hidup yang lestari dan dihormati lintas generasi.",
    },
    rules: {
      sectionBadge: "Norma & Etika Berkunjung",
      title: "Tata Tertib Kawasan Suci Adat",
      subtitle:
        "Demi menjaga kesucian, ketenangan, dan kelestarian situs cagar budaya, seluruh pengunjung wajib mematuhi panduan berikut:",
      rule1Title: "Wajib Berbusana Adat Khusus",
      rule1Desc:
        "Pengunjung yang memasuki kawasan cagar budaya wajib mengenakan kain adat (Kain Poleng/Dodot Sasak) dan sabuk/selendang yang telah disediakan oleh pengelola.",
      rule2Title: "Menjaga Kesopanan & Ketenangan",
      rule2Desc:
        "Dilarang membuat kegaduhan, berbicara kasar, atau melakukan tindakan yang melanggar norma kesopanan dan kesakralan situs bersejarah.",
      rule3Title: "Menjaga Kebersihan Lingkungan",
      rule3Desc:
        "Dilarang membuang sampah sembarangan. Sampah harus dibawa kembali atau dibuang pada tempat yang telah disediakan di luar area inti cagar budaya.",
      rule4Title: "Larangan Merokok & Api",
      rule4Desc:
        "Dilarang keras merokok atau menyalakan api di sekitar bangunan masjid kuno mengingat material atap dan dinding terbuat dari ijuk dan bambu kering yang mudah terbakar.",
      rule5Title: "Dokumentasi & Fotografi Beretika",
      rule5Desc:
        "Pengambilan foto dan video diperbolehkan untuk dokumentasi pribadi/pendidikan, dengan mematuhi arahan pemangku adat dan tidak menaiki bagian terlarang dari struktur masjid.",
      rule6Title: "Menghormati Ritual Tradisi",
      rule6Desc:
        "Saat upacara adat seperti Maulid Adat berlangsung, pengunjung wajib mematuhi batas area khusus yang telah ditetapkan oleh pemangku adat.",
    },
    attire: {
      sectionBadge: "Katalog & Layanan Busana",
      title: "Penyewaan Pakaian Adat Bayan",
      subtitle:
        "Pengelola menyediakan pakaian adat bersih, wangi, dan terawat untuk kenyamanan Anda saat berziarah dan berkeliling situs cagar budaya.",
      item1Title: "Kain Poleng Sasak Bayan",
      item1Category: "Kain Adat Bayan",
      item1Price: "Rp 20.000 / sewa",
      item1Desc:
        "Kain Poleng milik masyarakat adat Bayan, berbeda dengan kain Poleng Bali yang identik dengan motif hitam-putih. Kain  Poleng Bayan Memiliki makna filosofis mendalam tentang keseimbangan kosmis dan keadilan moral dalam kehidupan.",
      item2Title: "Kain Batik",
      item2Category: "Kain Batik",
      item2Price: "Rp 10.000 / sewa",
      item2Desc:
        "Kain batik, dapat dikenakan sebagai kain penutup kaki agar terlihat rapi dan elegan.",
      item3Title: "Sapuk dan Jong",
      item3Category: "Aksesoris Adat",
      item3Price: "Termasuk Paket",
      item3Desc:
        "Makna Sapuk melambangkan tiga fase kehidupan manusia: alam ruh, dunia, dan akhirat. Ikatan segi tiga Lam Jalalah menjadi pengingat bahwa manusia akan kembali kepada Allah dan mempertanggungjawabkan setiap perbuatannya." + " " + 
        "Makna Filosofis Jong: Kata “Jong” yang berasal dari “Junjung” atau “Jonnjong” menunjukkan bagaimana kain ini dihormati dan dijunjung tinggi sebagai bagian dari adat yang diwariskan turun-temurun.",
      includedNotice:
        "Layanan sewa sudah mencakup bantuan pemasangan busana adat oleh petugas.",
    },
    location: {
      sectionBadge: "Informasi Operasional",
      title: "Lokasi & Jam Berkunjung",
      subtitle:
        "Rencanakan perjalanan wisata spiritual dan budaya Anda ke Masjid Kuno Bayan Lombok Utara.",
      addressLabel: "Alamat Lengkap",
      addressValue:
        "Karang Bajo, Desa Bayan, Kecamatan Bayan, Kabupaten Lombok Utara, Nusa Tenggara Barat (NTB) 83354",
      hoursLabel: "Waktu Operasional",
      hoursValue: "Senin – Minggu: 09:00 – 17:00 WITA",
      timezoneNotice:
        "Seluruh pencatatan waktu resmi menggunakan zona waktu Asia/Makassar (WITA, UTC+8).",
      contactLabel: "Pengelola Lapangan",
      contactValue:
        "Lembaga Pemangku Adat & Kelompok Sadar Wisata (Pokdarwis) Desa Bayan",
    },
    footer: {
      tagline:
        "Sistem Digitalisasi Registrasi Pengunjung, Statistik Kunjungan, dan Manajemen Penyewaan Pakaian Adat Masjid Kuno Bayan.",
      quickLinks: "Tautan Cepat",
      rulesNotice:
        "Kawasan Cagar Budaya Dilindungi UU No. 11 Tahun 2010 tentang Cagar Budaya.",
      copyright: "Masjid Kuno Bayan • Kabupaten Lombok Utara, NTB.",
      rightsReserved: "© KELOMPOK KKN 92 UNDIKMA 2026 .",
    },
  },
  EN: {
    nav: {
      home: "Home",
      history: "History",
      rules: "Visitor Rules",
      attire: "Traditional Dress",
      location: "Location",
      register: "Register Visit",
      adminLogin: "Staff Portal",
    },
    hero: {
      badge: "National Cultural Heritage Site • 16th Century",
      title: "Welcome to the",
      titleHighlight: "Ancient Bayan Mosque",
      subtitle:
        "A living witness to the earliest Islamic civilization on Lombok Island. Experience spiritual tranquility, authentic bamboo architecture, and enduring indigenous wisdom at the foot of Mount Rinjani.",
      registerCta: "Register Visitor Online",
      rulesCta: "Read Cultural Etiquette",
      statAge: "± 500 Years",
      statAgeDesc: "Standing Since 16th Century",
      statHeritage: "Cultural Heritage",
      statHeritageDesc: "National Cultural Treasure",
      statTimezone: "09:00 - 17:00",
      statTimezoneDesc: "Open Daily (WITA / UTC+8)",
      statAttire: "Traditional Dress",
      statAttireDesc: "Rental Service Available",
    },
    history: {
      sectionBadge: "Historical Heritage & Local Wisdom",
      title: "Footprints of Bayan Ancestors",
      subtitle:
        "Preserving genuine traditions and environmental balance through centuries in the Sasak realm of North Lombok.",
      card1Title: "Vernacular Bamboo Architecture",
      card1Desc:
        "Constructed without iron nails atop a sacred hill. Woven bamboo walls (bedek), thatch and palm fiber roof, and river stone foundations reflect humanity's harmony with nature.",
      card2Title: "Gateway of Islam in Lombok",
      card2Desc:
        "Ancient Bayan Mosque stood as the epicenter for the arrival and spread of Islam on Lombok Island, blending peacefully with ancestral customs honoring peace and fraternity.",
      card3Title: "Sacred Forest & Rinjani Custodians",
      card3Desc:
        "The indigenous Bayan community upholds strict customary laws preserving the springs and sacred forests of Mount Rinjani, sustaining a balanced ecology across generations.",
    },
    rules: {
      sectionBadge: "Norms & Etiquette",
      title: "Sacred Ground Guidelines",
      subtitle:
        "To honor the sacredness, tranquility, and preservation of this national cultural site, all visitors must abide by the following:",
      rule1Title: "Traditional Attire Mandatory",
      rule1Desc:
        "All visitors entering the cultural heritage perimeter must wear traditional Sasak woven cloth (Kain Poleng) and sash provided by the site managers.",
      rule2Title: "Maintain Decorum & Quietness",
      rule2Desc:
        "Loud voices, vulgar language, and disrespectful behavior are strictly prohibited within the historic and sacred sanctuary grounds.",
      rule3Title: "Keep the Site Clean",
      rule3Desc:
        "Littering is strictly forbidden. Please carry your waste back or deposit it into designated bins located outside the core heritage area.",
      rule4Title: "No Smoking or Open Flame",
      rule4Desc:
        "Smoking or lighting fire is strictly prohibited near the ancient mosque structures, as the dry palm fiber and woven bamboo materials are combustible.",
      rule5Title: "Ethical Photography",
      rule5Desc:
        "Personal and educational photography is permitted with respect. Please do not climb on sacred stone bases or enter forbidden ritual enclosures.",
      rule6Title: "Respect Indigenous Ceremonies",
      rule6Desc:
        "During sacred traditional ceremonies (such as the Bayan Traditional Maulid), visitors must strictly follow perimeter guidelines set by customary leaders.",
    },
    attire: {
      sectionBadge: "Attire Catalog & Services",
      title: "Traditional Bayan Dress Rental",
      subtitle:
        "We provide fresh, clean, and well-maintained traditional garments for your comfort during pilgrimage and exploration.",
      item1Title: "Sasak Bayan Poleng Cloth",
      item1Category: "Mandatory Attire",
      item1Price: "IDR 20,000 / rental",
      item1Desc:
        "The Poleng cloth of the Bayan indigenous community differs from the Balinese Poleng cloth, which is characterized by its black-and-white pattern. The Bayan Poleng cloth carries a profound philosophical meaning concerning cosmic balance and moral justice in life.",
      item2Title: "Batik fabric",
      item2Category: "Batik fabric",
      item2Price: "IDR 10,000 / rental",
      item2Desc:
        "Batik fabric can be worn as a lower-body wrap to create a neat and elegant look.",
      item3Title: "Sapuk and Jong",
      item3Category: "Traditional Accessories",
      item3Price: "Included in Package",
      item3Desc:
        "The Sapuk symbolizes the three phases of human existence: the realm of the spirit, the earthly world, and the afterlife. Its triangular knot resembling the Arabic Lam Jalalah serves as a reminder that all human beings will eventually return to Allah and be held accountable for their actions." + " " +
        "As for the philosophical meaning of Jong: the term derived from junjung or jonnjong reflects how this fabric is revered and held in high regard as an integral part of a tradition passed down through generations.",
      includedNotice:
        "Rental service includes assistance from staff with putting on the traditional attire.",
    },
    location: {
      sectionBadge: "Visitor Information",
      title: "Location & Visiting Hours",
      subtitle:
        "Plan your spiritual and cultural voyage to the Ancient Bayan Mosque in North Lombok.",
      addressLabel: "Physical Address",
      addressValue:
        "Karang Bajo, Bayan Village, Bayan District, North Lombok Regency, West Nusa Tenggara (NTB) 83354, Indonesia",
      hoursLabel: "Visiting Hours",
      hoursValue: "Monday – Sunday: 09:00 AM – 05:00 PM WITA",
      timezoneNotice:
        "All official operations follow Central Indonesia Time (WITA, UTC+8).",
      contactLabel: "Site Custodians",
      contactValue:
        "Bayan Customary Heritage Council & Bayan Village Tourism Awareness Group",
    },
    footer: {
      tagline:
        "Digital Visitor Registration, Attendance Analytics, and Traditional Attire Rental System of Ancient Bayan Mosque.",
      quickLinks: "Quick Links",
      rulesNotice:
        "Protected Cultural Heritage under Indonesian Law No. 11/2010 on Cultural Heritage.",
      copyright:
        "Ancient Bayan Mosque • North Lombok Regency, West Nusa Tenggara.",
      rightsReserved: "All Rights Reserved.",
    },
  },
};
