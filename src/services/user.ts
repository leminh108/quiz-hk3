// Trong component hoặc service khác

import myAxios from '@/utils/AxiosClient';

interface User {
  id: number;
  name: string;
}

const getUser = async () => {
  try {
    // Không cần .data nữa vì http service đã unwrap rồi
    const user = await myAxios.get<User>('/users/1'); 
    console.log(user.name); // Type safe
  } catch (error) {
    // Error đã được log ở interceptor, xử lý UI ở đây
  }
}