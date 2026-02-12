<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\User;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = User::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'firstname' => $this->faker->firstName(),
            'lastname' => $this->faker->lastName(),
            'email' => $this->faker->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => $this->faker->randomElement(['student', 'teacher']),
            'reset_token' => null,
        ];
    }

    /**
     * Configure the model factory.
     *
     * @return $this
     */
    public function teacher()
    {
        return $this->state(function (array $attributes) {
            return [
                'role' => 'teacher',
            ];
        });
    }

    /**
     * Configure the model factory.
     *
     * @return $this
     */
    public function student()
    {
        return $this->state(function (array $attributes) {
            return [
                'role' => 'student',
            ];
        });
    }
}
