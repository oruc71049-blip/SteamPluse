import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// BURAYA ÖZ FIREBASE MƏLUMATLARINIZI YAZIN:
const firebaseConfig = {
  apiKey: "SƏNİN_API_KEY",
  authDomain: "SƏNİN_DOMEN",
  projectId: "SƏNİN_PROJECT_ID",
  storageBucket: "SƏNİN_STORAGE_BUCKET",
  messagingSenderId: "SƏNİN_SENDER_ID",
  appId: "SƏNİN_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const addVideoBtn = document.getElementById('addVideoBtn');
const authorInput = document.getElementById('authorInput');
const newTitleInput = document.getElementById('newTitleInput');
const newDescInput = document.getElementById('newDescInput');
const videoFileInput = document.getElementById('videoFileInput');
const fileLabel = document.getElementById('fileLabel');
const videoListContainer = document.getElementById('videoListContainer');
const emptyListText = document.getElementById('emptyListText');

videoFileInput.addEventListener('change', () => {
    if (videoFileInput.files.length > 0) {
        fileLabel.innerHTML = `<i class="fa-solid fa-check"></i> Seçildi: ${videoFileInput.files[0].name}`;
        fileLabel.style.borderColor = '#238636';
        fileLabel.style.color = '#238636';
    }
});

// Video Yükləmə Düyməsi
addVideoBtn.addEventListener('click', async () => {
    const author = authorInput.value.trim() || "Adsız İstifadəçi";
    const title = newTitleInput.value.trim();
    const desc = newDescInput.value.trim();
    const file = videoFileInput.files[0];

    if (title !== '' && file) {
        addVideoBtn.innerText = "Yüklənir, gözləyin...";
        addVideoBtn.disabled = true;

        try {
            // 1. Videonu Firebase Storage-a yükləyirik
            const storageRef = ref(storage, 'videos/' + Date.now() + '_' + file.name);
            await uploadBytes(storageRef, file);
            const videoUrl = await getDownloadURL(storageRef);

            // 2. Video məlumatlarını Firestore bazasına yazırıq
            await addDoc(collection(db, "videos"), {
                author: author,
                title: title,
                desc: desc,
                videoUrl: videoUrl,
                storagePath: storageRef.fullPath,
                createdAt: Date.now()
            });

            alert('Videonuz uğurla bütün istifadəçilər üçün paylaşıldı!');
            
            authorInput.value = '';
            newTitleInput.value = '';
            newDescInput.value = '';
            videoFileInput.value = '';
            fileLabel.innerHTML = `<i class="fa-solid fa-file-video"></i> Videonu Seç`;
            fileLabel.style.borderColor = '#30363d';
            fileLabel.style.color = '#c9d1d9';

        } catch (error) {
            console.error("Xəta baş verdi: ", error);
            alert("Video yüklənərkən xəta baş verdi!");
        } finally {
            addVideoBtn.innerText = "Sayta Yüklə";
            addVideoBtn.disabled = false;
        }
    } else {
        alert('Zəhmət olmasa adı, başlığı qeyd edin və video seçin.');
    }
});

// Bazadan videoları avtomatik oxumaq (Real-time)
function loadVideos() {
    onSnapshot(collection(db, "videos"), (snapshot) => {
        videoListContainer.innerHTML = '';
        if (snapshot.empty) {
            videoListContainer.innerHTML = '<p class="empty-list-text">Hələ ki, video paylaşılmayıb.</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;

            const card = document.createElement('div');
            card.classList.add('video-card');
            card.innerHTML = `
                <div class="video-info-wrapper">
                    <div class="thumbnail-box"><i class="fa-solid fa-play"></i></div>
                    <div class="video-card-info">
                        <h4>${data.title}</h4>
                        <small>${data.author}</small>
                    </div>
                </div>
                <button class="delete-btn" title="Sil"><i class="fa-solid fa-trash"></i></button>
            `;

            // Videoya klikləyəndə izlə
            card.querySelector('.video-info-wrapper').onclick = () => {
                switchVideo(data.videoUrl, data.title, data.desc, data.author);
            };

            // Videonu silmək (İstəsəniz yalnız özünüzün silməsi üçün şərt qoya bilərik)
            card.querySelector('.delete-btn').onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`"${data.title}" videosunu silmək istədiyinizdən əminsiniz?`)) {
                    try {
                        await deleteDoc(doc(db, "videos", docId));
                        const videoRef = ref(storage, data.storagePath);
                        await deleteObject(videoRef);
                        alert("Video silindi!");
                    } catch (err) {
                        alert("Silinərkən xəta baş verdi.");
                    }
                }
            };

            videoListContainer.appendChild(card);
        });
    });
}

function switchVideo(url, title, desc, author) {
    document.getElementById('noVideoMessage').style.display = 'none';
    const mainVideo = document.getElementById('mainVideo');
    mainVideo.style.display = 'block';
    document.getElementById('videoDetails').style.display = 'block';
    document.getElementById('commentsSection').style.display = 'block';

    mainVideo.src = url;
    document.getElementById('videoTitle').innerText = title;
    document.getElementById('videoDescription').innerText = desc || 'Açıqlama yoxdur.';
    document.getElementById('uploaderName').innerText = author;
    document.getElementById('uploaderAvatar').innerText = author.charAt(0).toUpperCase();
    mainVideo.play();
}

loadVideos();