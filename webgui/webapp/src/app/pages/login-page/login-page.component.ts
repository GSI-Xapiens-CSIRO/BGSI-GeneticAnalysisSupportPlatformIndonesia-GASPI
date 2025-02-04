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
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { GlobalSpinnerComponent } from '../../components/global-spinner/global-spinner.component';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { SpinnerService } from 'src/app/services/spinner.service';

const passwordsValidator = (): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const start = control.get('password')!.value;
    const end = control.get('newPassword')!.value;

    if (control.get('newPassword')?.enabled && start === end) {
      control
        .get('newPassword')
        ?.setErrors({ error: 'Password must be different' });
    }

    return null;
  };
};

enum StateTypes {
  ORDINARY_LOGIN = 1,
  FIRST_LOGIN = 2,
  PASSWORD_RESET = 3,
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
    GlobalSpinnerComponent,
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
        [Validators.required, Validators.minLength(6)],
      ),
      resetCode: new FormControl(
        { value: '', disabled: this.state !== StateTypes.PASSWORD_RESET },
        [Validators.required],
      ),
    },
    { validators: passwordsValidator() },
  );

  constructor(
    private auth: AuthService,
    private router: Router,
    private sb: MatSnackBar,
    private ss: SpinnerService,
  ) {}

  resetFormForgotPassword() {
    this.loginForm.reset({
      email: this.loginForm.value.email,
      password: '',
      newPassword: '',
      resetCode: '',
    });

    this.loginForm.controls.newPassword.disable();
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
          this.sb.open('Something went wrong, please contact admin!', 'Okay', {
            duration: 60000,
          });
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
            this.sb.open(
              'Password reset successful! You can now log in with your new password.',
              'Okay',
              {
                duration: 60000,
              },
            );

            this.state = StateTypes.ORDINARY_LOGIN;

            // reset form resetCode and newPassword
            this.resetFormForgotPassword();
          } else {
            this.sb.open(
              'Something went wrong, please contact admin!',
              'Okay',
              {
                duration: 60000,
              },
            );
          }
        } catch (error: any) {
          this.sb.open(error.message, 'Okay', {
            duration: 60000,
          });
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
            this.sb.open('Please recheck username and password!', 'Okay', {
              duration: 60000,
            });
            break;
          case 'NEW_PASSWORD_REQUIRED':
            this.state = StateTypes.FIRST_LOGIN;
            this.loginForm.controls.newPassword.enable();
            break;
        }
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
        this.sb.open(error.message, 'Okay', {
          duration: 60000,
        });
      }
    } else {
      this.loginForm.controls.email.markAsTouched();
    }
  }

  isSubmitDisabled(): boolean {
    const email = this.loginForm.controls.email.value;
    const password = this.loginForm.controls.password.value;
    const newPassword = this.loginForm.controls.newPassword.value;
    const resetCode = this.loginForm.controls.resetCode.value;

    // Disable button if using first login and no new password
    if (this.state === StateTypes.FIRST_LOGIN && !newPassword) {
      return true;
    }

    // Disable button if using password reset and no reset code or new password
    if (
      this.state === StateTypes.PASSWORD_RESET &&
      (!resetCode || !newPassword)
    ) {
      return true;
    }

    // disable button if using ordinary login and no email or password
    if (this.state === StateTypes.ORDINARY_LOGIN && (!email || !password)) {
      return true;
    }

    // Return false (button enabled) if no conditions match
    return false;
  }
}
