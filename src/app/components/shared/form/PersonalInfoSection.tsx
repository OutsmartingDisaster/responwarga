'use client';

import React from 'react';
import FormInput from './FormInput';

interface PersonalInfoData {
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
}

interface PersonalInfoSectionProps {
  data: PersonalInfoData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PersonalInfoSection({ data, onChange }: PersonalInfoSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Personal Information</h3>
      <FormInput
        label="Full Name"
        name="fullName"
        value={data.fullName}
        onChange={onChange}
        required
        placeholder="Enter your full name"
      />
      <FormInput
        label="Phone Number"
        name="phoneNumber"
        type="tel"
        value={data.phoneNumber}
        onChange={onChange}
        required
        placeholder="Enter your phone number"
      />
      <FormInput
        label="Email"
        name="email"
        type="email"
        value={data.email}
        onChange={onChange}
        required
        placeholder="Enter your email"
      />
      <FormInput
        label="Address"
        name="address"
        value={data.address}
        onChange={onChange}
        placeholder="Enter your address"
      />
    </div>
  );
}