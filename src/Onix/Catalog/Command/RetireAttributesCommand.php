<?php

declare(strict_types=1);

namespace Onix\Catalog\Command;

use Akeneo\Pim\Structure\Component\Repository\AttributeRepositoryInterface;
use Akeneo\Tool\Component\StorageUtils\Remover\RemoverInterface;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

final class RetireAttributesCommand extends Command
{
    private const RETIRED_CODES = [
        'onix_cover',
        'onix_author_photo_url',
        'onix_publisher_logo_url',
        'onix_author_bio',
    ];

    public function __construct(
        private readonly AttributeRepositoryInterface $attributeRepository,
        private readonly RemoverInterface $attributeRemover,
    ) {
        parent::__construct('onix:catalog:retire-attributes');
    }

    protected function configure(): void
    {
        $this->setDescription('Elimina de Akeneo los atributos cuya autoridad pasó a Directus/MinIO.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        foreach (self::RETIRED_CODES as $code) {
            $attribute = $this->attributeRepository->findOneByIdentifier($code);
            if (null === $attribute) {
                $output->writeln(sprintf('%s: ausente', $code));
                continue;
            }

            try {
                $this->attributeRemover->remove($attribute);
            } catch (\Throwable $exception) {
                // Akeneo's audit listener can fail in a CLI process after the
                // remover has already committed the deletion because there is
                // no authenticated web user. Only absorb that post-delete
                // failure; a real removal failure must still stop deployment.
                if (null !== $this->attributeRepository->findOneByIdentifier($code)) {
                    throw $exception;
                }
            }
            $output->writeln(sprintf('%s: retirado', $code));
        }

        return Command::SUCCESS;
    }
}
