"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from 'react-hot-toast';

// Utility to generate slug from name
function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export default function OrganizationOnboarding() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    province: "",
    country: "",
    map_location: "",
    short_description: "",
    description: "",
    logo_url: "",
    primary_contact_name: "",
    primary_contact_email: "",
    primary_contact_phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug as name is typed
  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const autoSlug = slugify(name);
    setForm({ ...form, name, slug: autoSlug });

    if (autoSlug) {
      const { data } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", autoSlug)
        .maybeSingle();
      if (data) {
        setError(`Slug '${autoSlug}' generated from name is already taken. Please choose a slightly different name.`);
      } else {
        setError(null);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!form.slug) {
      setError("Organization name cannot be empty.");
      setLoading(false);
      return;
    }

    try {
      const { data: existing } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", form.slug)
        .maybeSingle();

      if (existing) {
        throw new Error(`Slug '${form.slug}' generated from the name is already taken. Please choose a slightly different name.`);
      }

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert([
          {
            ...form,
            onboarding_complete: true,
          },
        ])
        .select()
        .single();

      if (orgError) throw orgError;

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("User not authenticated");
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ organization_id: org.id })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      router.push(`/responder/${org.slug}/dashboard`);
    } catch (err: any) {
      setError(err.message || "Failed to onboard organization.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-12 p-8 bg-zinc-900 text-zinc-100 rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Organization Onboarding</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Organization Name *</label>
          <input
            type="text"
            name="name"
            required
            value={form.name}
            onChange={handleNameChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
            placeholder="e.g., U-INSPIRE Indonesia"
          />
          {form.slug && (
            <p className="text-xs text-zinc-400 mt-1">
              Dashboard link will be: /responder/<span className="font-mono">{form.slug}</span>/
            </p>
          )}
          {error && form.slug && error.includes(form.slug) && (
            <p className="text-xs text-red-400 mt-1">{error}</p>
          )}
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Type</label>
          <input
            type="text"
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
            placeholder="NGO, Government, etc."
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Phone</label>
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Website</label>
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Address</label>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block font-medium mb-1 text-zinc-200">City</label>
            <input
              type="text"
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
            />
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1 text-zinc-200">Province</label>
            <input
              type="text"
              name="province"
              value={form.province}
              onChange={handleChange}
              className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
            />
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1 text-zinc-200">Country</label>
            <input
              type="text"
              name="country"
              value={form.country}
              onChange={handleChange}
              className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
            />
          </div>
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Map Location</label>
          <input
            type="text"
            name="map_location"
            value={form.map_location}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
            placeholder="Latitude,Longitude or GeoJSON"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Short Description</label>
          <input
            type="text"
            name="short_description"
            value={form.short_description}
            onChange={handleChange}
            maxLength={100}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Logo URL</label>
          <input
            type="text"
            name="logo_url"
            value={form.logo_url}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
            placeholder="https://.../logo.png"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Primary Contact Name</label>
          <input
            type="text"
            name="primary_contact_name"
            value={form.primary_contact_name}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block font-medium mb-1 text-zinc-200">Primary Contact Email</label>
            <input
              type="email"
              name="primary_contact_email"
              value={form.primary_contact_email}
              onChange={handleChange}
              className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
            />
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1 text-zinc-200">Primary Contact Phone</label>
            <input
              type="text"
              name="primary_contact_phone"
              value={form.primary_contact_phone}
              onChange={handleChange}
              className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2 placeholder-zinc-400"
            />
          </div>
        </div>
        {error && !error.includes("Slug '") && (
          <p className="text-red-400 bg-red-900/30 p-3 rounded">Error: {error}</p>
        )}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 text-white font-bold py-2 px-4 rounded"
          >
            {loading ? "Submitting..." : "Complete Onboarding"}
          </button>
        </div>
      </form>
    </div>
  );
}
