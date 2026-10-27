"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Message = {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL: string;
  createdAt: any;
  replyTo?: {
    id: string;
    text: string;
    displayName: string;
  };
  edited?: boolean;
};

type Room = "takas" | "satis" | "sohbet";

type UserProfile = {
  uid: string;
  displayName: string;
  age: string;
  photoURL: string;
};

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [photo, setPhoto] = useState("");
  const [room, setRoom] = useState<Room>("sohbet");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showDM, setShowDM] = useState(false);
  const [dmUser, setDmUser] = useState<{
    uid: string;
    displayName: string;
    photoURL: string;
  } | null>(null);
  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  const [dmText, setDmText] = useState("");
  const [following, setFollowing] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef(0);

  // localStorage'dan kullanıcıyı yükle
  useEffect(() => {
    const saved = localStorage.getItem("yesrealy_user");
    if (saved) {
      setUser(JSON.parse(saved));
    } else {
      setShowSetup(true);
    }
  }, []);

  // Kullanıcı kaydı
  useEffect(() => {
    if (!user) return;
    setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        age: user.age,
      },
      { merge: true }
    );
    getDoc(doc(db, "follows", user.uid)).then((snap) => {
      if (snap.exists()) setFollowing(snap.data().following || []);
    });
  }, [user]);

  // Oda mesajları
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "rooms", room, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Message[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Message));
      setMessages(list);
    });
    return () => unsub();
  }, [user, room]);

  // DM
  useEffect(() => {
    if (!user || !dmUser) return;
    const chatId = [user.uid, dmUser.uid].sort().join("_");
    const q = query(
      collection(db, "dms", chatId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Message[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Message));
      setDmMessages(list);
    });
    return () => unsub();
  }, [user, dmUser]);

  // Tüm kullanıcılar
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        if (d.id !== user.uid) list.push({ id: d.id, ...d.data() });
      });
      setAllUsers(list);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, dmMessages]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    if (!name.trim() || !age.trim()) {
      alert("Kullanıcı adı ve yaş zorunlu");
      return;
    }
    const profile: UserProfile = {
      uid: "u_" + Date.now() + Math.random().toString(36).slice(2, 8),
      displayName: name.trim(),
      age: age.trim(),
      photoURL: photo || "https://via.placeholder.com/100",
    };
    localStorage.setItem("yesrealy_user", JSON.stringify(profile));
    setUser(profile);
    setShowSetup(false);
  };

  const sendMessage = async (isDM = false) => {
    if (!user) return;
    const content = isDM ? dmText : text;
    if (!content.trim()) return;

    const data: any = {
      text: content.trim(),
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
    };

    if (replyingTo) {
      data.replyTo = {
        id: replyingTo.id,
        text: replyingTo.text.slice(0, 50),
        displayName: replyingTo.displayName,
      };
    }

    if (isDM && dmUser) {
      const chatId = [user.uid, dmUser.uid].sort().join("_");
      await addDoc(collection(db, "dms", chatId, "messages"), data);
      setDmText("");
    } else {
      await addDoc(collection(db, "rooms", room, "messages"), data);
      setText("");
    }
    setReplyingTo(null);
  };

  const editMessage = async (id: string) => {
    if (!editText.trim()) return;
    await updateDoc(doc(db, "rooms", room, "messages", id), {
      text: editText.trim(),
      edited: true,
    });
    setEditingId(null);
    setEditText("");
  };

  const deleteMessage = async (id: string) => {
    await deleteDoc(doc(db, "rooms", room, "messages", id));
  };

  const toggleFollow = async (targetUid: string) => {
    if (!user) return;
    const ref = doc(db, "follows", user.uid);
    const snap = await getDoc(ref);
    let list: string[] = snap.exists() ? snap.data().following || [] : [];
    if (list.includes(targetUid)) {
      list = list.filter((x) => x !== targetUid);
    } else {
      list.push(targetUid);
    }
    await setDoc(ref, { following: list }, { merge: true });
    setFollowing(list);
  };

  const openDM = (u: any) => {
    const uid = u.uid || u.id;
    if (!following.includes(uid)) {
      alert("Önce takip etmelisin!");
      return;
    }
    setDmUser({
      uid,
      displayName: u.displayName,
      photoURL: u.photoURL,
    });
  };

  const handleTouchStart = (msg: Message) => {
    longPressTimer.current = setTimeout(() => {
      if (msg.uid === user?.uid) {
        const action = confirm("Düzenle (Tamam) / Sil (İptal)");
        if (action) {
          setEditingId(msg.id);
          setEditText(msg.text);
        } else {
          if (confirm("Mesaj silinsin mi?")) deleteMessage(msg.id);
        }
      }
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleTouchMoveStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMoveEnd = (e: React.TouchEvent, msg: Message) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 80) setReplyingTo(msg);
  };

  // İlk kurulum ekranı
  if (showSetup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 bg-zinc-950">
        <h1 className="text-4xl font-bold rainbow-text">YesRealy</h1>
        <p className="text-zinc-400 text-sm mb-4">Profilini oluştur</p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Kullanıcı adı"
          className="w-full max-w-xs bg-zinc-900 rounded-xl px-4 py-3 outline-none"
        />
        <input
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Yaş"
          type="number"
          className="w-full max-w-xs bg-zinc-900 rounded-xl px-4 py-3 outline-none"
        />
        <label className="w-full max-w-xs bg-zinc-900 rounded-xl px-4 py-3 text-center cursor-pointer">
          {photo ? "Fotoğraf seçildi ✓" : "Profil fotoğrafı seç"}
          <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </label>
        {photo && (
          <img src={photo} className="w-20 h-20 rounded-full object-cover" alt="" />
        )}
        <button
          onClick={saveProfile}
          className="w-full max-w-xs bg-blue-600 rounded-xl py-3 font-semibold mt-2"
        >
          Kaydet ve Gir
        </button>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto relative bg-zinc-950">
      {/* Header */}
      <div className="pt-4 pb-2 text-center border-b border-zinc-800">
        <h1 className="text-3xl font-bold rainbow-text">YesRealy</h1>
        <p className="text-xs text-zinc-500 -mt-1">Realy</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {(["takas", "satis", "sohbet"] as Room[]).map((r) => (
          <button
            key={r}
            onClick={() => setRoom(r)}
            className={`flex-1 py-3 text-sm font-medium ${
              room === r ? "text-white border-b-2 border-white" : "text-zinc-500"
            }`}
          >
            {r === "takas" ? "Takas Sohpeti" : r === "satis" ? "Satış Sohpeti" : "Sohpet"}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.uid === user.uid ? "flex-row-reverse" : ""}`}
            onTouchStart={() => handleTouchStart(msg)}
            onTouchEnd={handleTouchEnd}
            onTouchStartCapture={handleTouchMoveStart}
            onTouchEndCapture={(e) => handleTouchMoveEnd(e, msg)}
          >
            <img src={msg.photoURL} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                msg.uid === user.uid ? "bg-blue-600 rounded-br-md" : "bg-zinc-800 rounded-bl-md"
              }`}
            >
              {msg.uid !== user.uid && (
                <p className="text-xs text-zinc-400 mb-1">{msg.displayName}</p>
              )}
              {msg.replyTo && (
                <div className="text-xs bg-black/30 rounded px-2 py-1 mb-1 border-l-2 border-white/50">
                  <span className="font-medium">{msg.replyTo.displayName}</span>
                  <p className="truncate opacity-70">{msg.replyTo.text}</p>
                </div>
              )}
              {editingId === msg.id ? (
                <div className="flex gap-2">
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="bg-black/40 rounded px-2 py-1 text-sm flex-1 outline-none"
                    autoFocus
                  />
                  <button onClick={() => editMessage(msg.id)} className="text-xs text-green-400">
                    Kaydet
                  </button>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {msg.text}
                  {msg.edited && <span className="text-[10px] opacity-50 ml-1">(düzenlendi)</span>}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply bar */}
      {replyingTo && (
        <div className="bg-zinc-900 px-3 py-2 flex items-center justify-between text-sm border-t border-zinc-800">
          <div>
            <span className="text-zinc-400">Yanıtlanıyor: </span>
            {replyingTo.displayName}
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-zinc-500">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-zinc-800 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Mesaj yaz..."
          className="flex-1 bg-zinc-900 rounded-full px-4 py-2 text-sm outline-none"
        />
        <button
          onClick={() => sendMessage()}
          className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center"
        >
          ➤
        </button>
      </div>

      {/* DM Button */}
      <button
        onClick={() => setShowDM(true)}
        className="absolute right-3 top-20 bg-zinc-800 p-2 rounded-full text-sm"
      >
        💬
      </button>

      {/* DM Panel */}
      {showDM && (
        <div className="absolute inset-y-0 right-0 w-80 bg-zinc-900 border-l border-zinc-700 flex flex-col z-50 shadow-2xl">
          <div className="p-3 border-b border-zinc-700 flex items-center justify-between">
            <h3 className="font-semibold">{dmUser ? dmUser.displayName : "Mesajlar"}</h3>
            <button onClick={() => { setShowDM(false); setDmUser(null); }}>✕</button>
          </div>

          {!dmUser ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-xs text-zinc-500 mb-2">Takip ettiklerin:</p>
              {allUsers
                .filter((u) => following.includes(u.uid || u.id))
                .map((u) => (
                  <div
                    key={u.uid || u.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 cursor-pointer"
                    onClick={() => openDM(u)}
                  >
                    <img src={u.photoURL} className="w-8 h-8 rounded-full" alt="" />
                    <span className="text-sm">{u.displayName}</span>
                  </div>
                ))}
              <p className="text-xs text-zinc-500 mt-4 mb-2">Tüm kullanıcılar:</p>
              {allUsers.map((u) => (
                <div
                  key={u.uid || u.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800"
                >
                  <div className="flex items-center gap-2">
                    <img src={u.photoURL} className="w-8 h-8 rounded-full" alt="" />
                    <span className="text-sm">{u.displayName}</span>
                  </div>
                  <button
                    onClick={() => toggleFollow(u.uid || u.id)}
                    className="text-xs bg-zinc-700 px-2 py-1 rounded"
                  >
                    {following.includes(u.uid || u.id) ? "Takipten Çık" : "Takip Et"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {dmMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.uid === user.uid ? "justify-end" : ""}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        msg.uid === user.uid ? "bg-blue-600" : "bg-zinc-800"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-zinc-700 flex gap-2">
                <input
                  value={dmText}
                  onChange={(e) => setDmText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(true)}
                  placeholder="DM yaz..."
                  className="flex-1 bg-zinc-800 rounded-full px-3 py-2 text-sm outline-none"
                />
                <button onClick={() => sendMessage(true)}>➤</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Kurucu */}
      <a
        href="https://www.tiktok.com/@foxrealy1?_r=1&_t=ZS-9AulQA4Ldfp"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs px-4 py-2 rounded-full shadow-lg z-40"
      >
        Kurucu
      </a>
    </div>
  );
}
