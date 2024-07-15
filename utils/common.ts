export const getErrorMessage = (error: unknown) => {
  let message = 'Something went wrong';
  if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object' && 'shortMessage' in error) {
    message = error.shortMessage as string;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = error.message as string;
  } else if (error instanceof Error) {
    message = error.message;
  }
  return message;
};

export function formatAmount(number: number, precision = 2) {
  return +number.toFixed(precision);
}
export function formatNumberWithCommas(x: number) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function response(data: any, statusCode = 200) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
  });
}

export function errorResponse() {
  return new Response(JSON.stringify({ error: 'Something wrong!' }), {
    status: 500,
  });
}
