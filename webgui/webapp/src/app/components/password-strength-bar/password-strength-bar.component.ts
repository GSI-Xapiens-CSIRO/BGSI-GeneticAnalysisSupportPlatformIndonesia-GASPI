import { Component, Input } from '@angular/core';

export const isStrongPassword = (password: string): boolean => {
  return getPasswordStrength(password) == 5;
};

export const hasLowerCaseLetter = (password: string): boolean => {
  return /[a-z]+/.test(password);
};

export const hasUpperCaseLetter = (password: string): boolean => {
  return /[A-Z]+/.test(password);
};

export const hasNumber = (password: string): boolean => {
  return /[0-9]+/.test(password);
};

export const hasSpecialCharacter = (password: string): boolean => {
  return /[\^\$\*\.\[\]\{\}\(\)\?"!@#%&/\\,><\':;|_~`=+\-]/.test(password);
};

export const hasCorrectLength = (password: string): boolean => {
  return password.length >= 8;
};

export const hasLeadingOrTrailingWhitespace = (password: string): boolean => {
  return /^\s|\s$/.test(password);
};

export const getPasswordStrength = (password: string): number => {
  let strength = 0;
  if (hasLeadingOrTrailingWhitespace(password)) {
    return 0;
  }
  if (hasLowerCaseLetter(password)) {
    strength++;
  }
  if (hasUpperCaseLetter(password)) {
    strength++;
  }
  if (hasNumber(password)) {
    strength++;
  }
  if (hasSpecialCharacter(password)) {
    strength++;
  }
  if (hasCorrectLength(password)) {
    strength++;
  }

  return strength;
};

@Component({
  selector: 'app-password-strength-bar',
  standalone: true,
  imports: [],
  templateUrl: './password-strength-bar.component.html',
  styleUrl: './password-strength-bar.component.scss',
})
export class PasswordStrengthBarComponent {
  @Input({ required: true }) password!: string;

  isStrongPassword = isStrongPassword;
  hasLowerCaseLetter = hasLowerCaseLetter;
  hasUpperCaseLetter = hasUpperCaseLetter;
  hasNumber = hasNumber;
  hasSpecialCharacter = hasSpecialCharacter;
  hasCorrectLength = hasCorrectLength;
  hasLeadingOrTrailingWhitespace = hasLeadingOrTrailingWhitespace;
  getPasswordStrength = getPasswordStrength;
}
