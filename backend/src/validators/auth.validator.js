const { z } = require('zod');

// ─── Helper: Age ≥ 18 validation ────────────────────────
const isAtLeast18 = (dateString) => {
  const dob = new Date(dateString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
};

// ─── Donor Profile Fields ───────────────────────────────
const donorProfileSchema = z.object({
  phone: z.string().min(7, 'Phone number is required'),
  dateOfBirth: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' })
    .refine((val) => isAtLeast18(val), { message: 'You must be at least 18 years old to register' }),
  gender: z.string().min(1, 'Gender is required'),
  address: z.string().min(1, 'Address is required'),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
    errorMap: () => ({ message: 'Invalid blood type' }),
  }),
  weight: z
    .number({ invalid_type_error: 'Weight must be a number' })
    .min(50, 'You must weigh at least 50 kg to donate'),
  lastDonationDate: z.string().optional().nullable(),
  medicalCondition: z.string().optional().nullable(),
});

// ─── Recipient Profile Fields ───────────────────────────
const recipientProfileSchema = z.object({
  phone: z.string().min(7, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
    errorMap: () => ({ message: 'Invalid blood type' }),
  }),
  medicalCondition: z.string().optional().nullable(),
});

// ─── Registration Schema ────────────────────────────────
const registerSchema = z
  .object({
    email: z.string().email('Please provide a valid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['DONOR', 'RECIPIENT'], {
      errorMap: () => ({ message: 'Role must be either DONOR or RECIPIENT' }),
    }),
    // Profile fields are spread at the top level
    // and validated conditionally via superRefine
    phone: z.string().optional(),
    province: z.string().optional(),
    district: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    address: z.string().optional(),
    bloodType: z.string().optional(),
    weight: z.number().optional(),
    lastDonationDate: z.string().optional().nullable(),
    medicalCondition: z.string().optional().nullable(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    if (data.role === 'DONOR') {
      const result = donorProfileSchema.safeParse({
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        address: data.address,
        bloodType: data.bloodType,
        weight: data.weight,
        lastDonationDate: data.lastDonationDate,
        medicalCondition: data.medicalCondition,
      });
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue(issue);
        });
      }
    }

    if (data.role === 'RECIPIENT') {
      const result = recipientProfileSchema.safeParse({
        phone: data.phone,
        address: data.address,
        bloodType: data.bloodType,
        medicalCondition: data.medicalCondition,
      });
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue(issue);
        });
      }
    }
  });

// ─── Login Schema ───────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Forgot Password Schema ──────────────────────────────
const forgotPasswordSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

// ─── Reset Password Schema ───────────────────────────────
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
