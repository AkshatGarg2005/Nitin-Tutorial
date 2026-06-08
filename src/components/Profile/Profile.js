import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';
import {
  HiOutlinePencil, HiOutlineCheck, HiOutlineX, HiOutlineCamera,
} from 'react-icons/hi';

export default function Profile() {
  const { userProfile, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  if (!userProfile) {
    return (
      <div className="spinner-overlay">
        <div className="spinner"></div>
      </div>
    );
  }

  function startEdit() {
    setForm({
      name: userProfile.name || '',
      studentPhone: userProfile.studentPhone || '',
      aadhaar: userProfile.aadhaar || '',
      dob: userProfile.dob || '',
      address: userProfile.address || '',
      previousEducation: userProfile.previousEducation || '',
      mothersName: userProfile.mothersName || '',
      fathersName: userProfile.fathersName || '',
      guardianName: userProfile.guardianName || '',
      guardianPhone: userProfile.guardianPhone || '',
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setForm({});
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo must be under 5MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const updates = { ...form };
      if (photoFile) {
        updates.photoURL = await uploadToCloudinary(photoFile);
      }
      await updateProfile(updates);
      toast.success('Profile updated!');
      setEditing(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  const displayPhoto = photoPreview || userProfile.photoURL;

  const fields = [
    { key: 'name', label: 'Full Name', type: 'text' },
    { key: 'studentPhone', label: 'Student Phone', type: 'tel' },
    { key: 'dob', label: 'Date of Birth', type: 'date' },
    { key: 'aadhaar', label: 'Aadhaar Number', type: 'text' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'previousEducation', label: 'Previous Education', type: 'text' },
    { key: 'mothersName', label: "Mother's Name", type: 'text' },
    { key: 'fathersName', label: "Father's Name", type: 'text' },
    { key: 'guardianName', label: 'Guardian Name', type: 'text' },
    { key: 'guardianPhone', label: 'Guardian Phone', type: 'tel' },
  ];

  const readOnlyFields = [
    { label: 'Email', value: userProfile.email },
    { label: 'Date of Admission', value: userProfile.dateOfAdmission || '—' },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ textAlign: 'center', paddingBottom: 48 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div className="avatar avatar-lg" style={{
            width: 88, height: 88, fontSize: '2rem', margin: '0 auto 12px',
            border: '3px solid rgba(255,255,255,0.3)',
          }}>
            {displayPhoto ? (
              <img src={displayPhoto} alt={userProfile.name} />
            ) : (
              getInitials(userProfile.name)
            )}
          </div>
          {editing && (
            <label htmlFor="profile-photo-input" style={{
              position: 'absolute', bottom: 8, right: -4,
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--white)', color: 'var(--green-700)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: 'var(--shadow-md)',
              fontSize: '0.875rem',
            }}>
              <HiOutlineCamera />
              <input
                type="file"
                id="profile-photo-input"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
        <h1>{userProfile.name}</h1>
        <p>{userProfile.email}</p>
      </div>

      {/* Edit / Save / Cancel buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        {!editing ? (
          <button className="btn btn-secondary btn-sm" onClick={startEdit} id="profile-edit">
            <HiOutlinePencil /> Edit Profile
          </button>
        ) : (
          <>
            <button className="btn btn-secondary btn-sm" onClick={cancelEdit} disabled={saving}>
              <HiOutlineX /> Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} id="profile-save">
              <HiOutlineCheck /> {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        )}
      </div>

      {/* Editable Fields */}
      <div className="stagger-list">
        {fields.map((field) => (
          <div className="list-card" key={field.key}>
            <div className="list-card-content" style={{ width: '100%' }}>
              <p style={{
                fontSize: '0.75rem', textTransform: 'uppercase',
                letterSpacing: '0.5px', fontWeight: 600,
                color: 'var(--gray-400)', marginBottom: 4,
              }}>
                {field.label}
              </p>
              {editing ? (
                field.type === 'textarea' ? (
                  <textarea
                    className="form-input"
                    value={form[field.key] || ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    rows={2}
                    style={{ fontSize: '0.9375rem', padding: '8px 12px' }}
                  />
                ) : (
                  <input
                    type={field.type}
                    className="form-input"
                    value={form[field.key] || ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    style={{ fontSize: '0.9375rem', padding: '8px 12px' }}
                  />
                )
              ) : (
                <h4 style={{ fontSize: '0.9375rem' }}>
                  {userProfile[field.key] || '—'}
                </h4>
              )}
            </div>
          </div>
        ))}

        {/* Read-only fields */}
        {readOnlyFields.map((field) => (
          <div className="list-card" key={field.label} style={{ opacity: editing ? 0.5 : 1 }}>
            <div className="list-card-content">
              <p style={{
                fontSize: '0.75rem', textTransform: 'uppercase',
                letterSpacing: '0.5px', fontWeight: 600,
                color: 'var(--gray-400)', marginBottom: 2,
              }}>
                {field.label} {editing && <span style={{ fontSize: '0.625rem', color: 'var(--gray-300)' }}>(read-only)</span>}
              </p>
              <h4 style={{ fontSize: '0.9375rem' }}>{field.value}</h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
