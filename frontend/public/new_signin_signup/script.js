function toggleForms(type) {
<<<<<<< HEAD
  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');
  const signInBtn = document.getElementById('signInBtn');
  const signUpBtn = document.getElementById('signUpBtn');

  if (type === 'signIn') {
    signInForm.classList.remove('hidden');
    signUpForm.classList.add('hidden');
    signInBtn.classList.add('border-purple-600');
    signUpBtn.classList.remove('border-purple-600');
  } else {
    signUpForm.classList.remove('hidden');
    signInForm.classList.add('hidden');
    signUpBtn.classList.add('border-purple-600');
    signInBtn.classList.remove('border-purple-600');
  }
}
=======
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');

    if (type === 'signIn') {
      signInForm.classList.remove('d-none');
      signUpForm.classList.add('d-none');
      signInBtn.classList.add('active');
      signUpBtn.classList.remove('active');
    } else {
      signUpForm.classList.remove('d-none');
      signInForm.classList.add('d-none');
      signUpBtn.classList.add('active');
      signInBtn.classList.remove('active');
    }
  }
>>>>>>> f460b295732004268ddb69d49ee0c37abc92c4ac
