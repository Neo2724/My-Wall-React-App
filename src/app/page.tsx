"use client";
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

const PROFILE_NAME = "James Neo Culala";
const TABLE = "messages";

type Message = {
  id: string;
  name: string;
  text: string;
  created_at: string;
  photo_url?: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch messages from Supabase
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setMessages(data as Message[]);
      setLoading(false);
    };
    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("messages-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        (payload) => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  // Handle posting a new message
  const handleShare = async () => {
    if (!input.trim()) return;

    let photo_url = null;
    if (photo) {
      const fileExt = photo.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase
        .storage
        .from('wall-photos')
        .upload(fileName, photo);

      if (uploadError) {
        alert('Error uploading photo: ' + uploadError.message);
        return;
      }
      photo_url = supabase.storage.from('wall-photos').getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabase.from(TABLE).insert([
      {
        name: PROFILE_NAME,
        text: input.trim(),
        photo_url,
      },
    ]);
    if (error) {
      alert('Error posting message: ' + error.message);
      console.error(error);
    } else {
      setInput("");
      setPhoto(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Post Input */}
      <Card className="mb-6 p-4 flex flex-col gap-2 shadow-sm">
        <textarea
          className="w-full border rounded-md p-3 resize-none text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
          rows={2}
          maxLength={280}
          placeholder="What's on your mind?"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <div className="flex items-center gap-2 mb-2">
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            ref={fileInputRef}
            className="hidden"
            id="photo-upload"
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-200 text-gray-700 hover:bg-blue-100"
          >
            {photo ? "Change Photo" : "Upload Photo"}
          </Button>
          {photo && (
            <span className="text-xs text-gray-500 truncate max-w-[120px]">
              {photo.name}
            </span>
          )}
        </div>
        {photo && (
          <img
            src={URL.createObjectURL(photo)}
            alt="Preview"
            className="mt-2 rounded max-h-24"
          />
        )}
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>{280 - input.length} characters remaining</span>
          <Button
            onClick={handleShare}
            disabled={!input.trim() || input.length > 280}
            className="bg-blue-500 text-white px-4 py-1 rounded-md"
          >
            Share
          </Button>
        </div>
      </Card>
      {/* Feed */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="text-center text-gray-400">Loading...</div>
        ) : (
          messages.map((post: Message) => (
            <Card key={post.id} className="p-4 flex flex-col gap-1 shadow-sm">
              <div className="font-semibold text-sm">{post.name}</div>
              <div className="text-base text-gray-800 break-words">{post.text}</div>
              {post.photo_url && (
                <img
                  src={post.photo_url}
                  alt="Wall post"
                  className="rounded-lg max-w-xs mb-2"
                />
              )}
              <div className="text-xs text-gray-400 mt-1">
                {new Date(post.created_at).toLocaleString()}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
