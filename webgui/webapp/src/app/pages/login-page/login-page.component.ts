import { Component } from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { SpinnerService } from 'src/app/services/spinner.service';
import {
  isStrongPassword,
  PasswordStrengthBarComponent,
} from 'src/app/components/password-strength-bar/password-strength-bar.component';
import { ToastrService } from 'ngx-toastr';

const passwordsValidator = (): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const start = control.get('password')!.value;
    const end = control.get('newPassword')!.value;
    const retypePassword = control.get('confirmationPassword')!.value;

    if (control.get('newPassword')?.enabled && start === end) {
      control
        .get('newPassword')
        ?.setErrors({ error: 'Password must be different' });
    }

    if (
      control.get('confirmationPassword')?.enabled &&
      end !== retypePassword
    ) {
      control.get('confirmationPassword')?.setErrors({
        error: 'The new password and confirmation password do not match.',
      });
    }

    return null;
  };
};

enum StateTypes {
  ORDINARY_LOGIN = 1,
  FIRST_LOGIN = 2,
  PASSWORD_RESET = 3,
  TOTP_LOGIN = 4,
}

/*
 * This component is a state machine, it has states indicated in
 * StateTypes interface. Each UI elements is turned on or off using
 * these states of the state machine
 */
@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  standalone: true,
  imports: [
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
    MatButtonModule,
    PasswordStrengthBarComponent,
  ],
})
export class LoginPageComponent {
  protected state = StateTypes.ORDINARY_LOGIN;
  protected StateTypes = StateTypes;
  protected loading = false;

  protected loginForm = new FormGroup(
    {
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required]),
      newPassword: new FormControl(
        { value: '', disabled: this.state !== StateTypes.FIRST_LOGIN },
        [Validators.required, Validators.minLength(8)],
      ),
      confirmationPassword: new FormControl(
        { value: '', disabled: this.state !== StateTypes.FIRST_LOGIN },
        [Validators.required],
      ),
      resetCode: new FormControl(
        { value: '', disabled: this.state !== StateTypes.PASSWORD_RESET },
        [Validators.required],
      ),
      totp: new FormControl(
        { value: '', disabled: this.state !== StateTypes.TOTP_LOGIN },
        [Validators.required, Validators.minLength(6), Validators.maxLength(6)],
      ),
    },
    { validators: passwordsValidator() },
  );
  isStrongPassword = isStrongPassword;

  constructor(
    private auth: AuthService,
    private router: Router,
    private tstr: ToastrService,
    private ss: SpinnerService,
  ) {}

  resetFormForgotPassword() {
    this.loginForm.reset({
      email: this.loginForm.value.email,
      password: '',
      newPassword: '',
      confirmationPassword: '',
      resetCode: '',
    });

    this.loginForm.controls.newPassword.disable();
    this.loginForm.controls.confirmationPassword.disable();
    this.loginForm.controls.resetCode.disable();
  }

  async login() {
    this.ss.start();
    switch (this.state) {
      case StateTypes.FIRST_LOGIN: {
        const success = await this.auth.newPassword(
          this.loginForm.value.newPassword!,
        );
        if (success) {
          this.router.navigate(['/']);
        } else {
          this.tstr.error(
            'Something went wrong, please contact admin!',
            'Error',
          );
        }
        break;
      }
      case StateTypes.PASSWORD_RESET: {
        try {
          const response = await this.auth.resetPassword(
            this.loginForm.value.email!,
            this.loginForm.value.resetCode!,
            this.loginForm.value.newPassword!,
          );

          if (response === 'SUCCESS') {
            this.tstr.success(
              'Password reset successful! You can now log in with your new password.',
              'Success',
            );

            this.state = StateTypes.ORDINARY_LOGIN;

            // reset form resetCode and newPassword
            this.resetFormForgotPassword();
          } else {
            this.tstr.error(
              'Something went wrong, please contact admin!',
              'Error',
            );
          }
        } catch (error: any) {
          this.tstr.error(error.message, 'OkaErrory');
        }

        break;
      }
      case StateTypes.ORDINARY_LOGIN: {
        const success = await this.auth.signIn(
          this.loginForm.value.email!,
          this.loginForm.value.password!,
        );
        switch (success) {
          case true:
            this.router.navigate(['/']);
            break;
          case false:
            this.tstr.error('Please recheck username and password!', 'Error');
            break;
          case 'NEW_PASSWORD_REQUIRED':
            this.state = StateTypes.FIRST_LOGIN;
            this.loginForm.controls.newPassword.enable();
            this.loginForm.controls.confirmationPassword.enable();
            this.tstr.warning(
              'Please Set Your New Password.',
              'First Time Login',
            );
            break;
          case 'SOFTWARE_TOKEN_MFA':
            this.state = StateTypes.TOTP_LOGIN;
            this.loginForm.controls.totp.enable();
        }
        break;
      }
      case StateTypes.TOTP_LOGIN: {
        const success = await this.auth.signInWithTOTP(
          this.loginForm.value.totp!,
        );
        if (success) {
          this.router.navigate(['/']);
        } else {
          this.tstr.error('Please recheck TOTP!', 'Error');
        }
        this.state = StateTypes.ORDINARY_LOGIN;
        break;
      }
    }
    this.ss.end();

    // clear validators message after login
    this.loginForm.clearValidators();
  }

  async forgotPassword() {
    if (this.loginForm.controls.email.valid) {
      this.loading = true;
      try {
        const success = await this.auth.forgotPassword(
          this.loginForm.value.email!,
        );

        if (success) {
          this.state = StateTypes.PASSWORD_RESET;
          this.loginForm.controls.resetCode.enable();
          this.loginForm.controls.newPassword.enable();
        }

        this.loading = false;
      } catch (error: any) {
        this.tstr.error(error.message, 'Error');
      }
    } else {
      this.loginForm.controls.email.markAsTouched();
    }
  }

  isSubmitDisabled(): boolean {
    const email = this.loginForm.controls.email.value;
    const password = this.loginForm.controls.password.value;
    const newPassword = this.loginForm.controls.newPassword.value;
    const confirmationPassword =
      this.loginForm.controls.confirmationPassword.value;
    const resetCode = this.loginForm.controls.resetCode.value;

    // Disable button if using first login and no new password or new password is weak
    if (
      this.state === StateTypes.FIRST_LOGIN &&
      (!newPassword ||
        (newPassword && !isStrongPassword(newPassword)) ||
        newPassword !== confirmationPassword)
    ) {
      return true;
    }

    // Disable button if using password reset and no reset code or new password or weak new password
    if (
      this.state === StateTypes.PASSWORD_RESET &&
      (!resetCode ||
        !newPassword ||
        (newPassword && !isStrongPassword(newPassword)))
    ) {
      return true;
    }

    // disable button if using ordinary login and no email or password
    if (this.state === StateTypes.ORDINARY_LOGIN && (!email || !password)) {
      return true;
    }

    if (this.state === StateTypes.TOTP_LOGIN) {
      return !this.loginForm.controls.totp.valid;
    }

    // Return false (button enabled) if no conditions match
    return false;
  }
}
